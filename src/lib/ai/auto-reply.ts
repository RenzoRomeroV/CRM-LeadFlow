import { supabaseAdmin } from './admin-client'
import { loadAiConfig } from './config'
import { buildConversationContext } from './context'
import { retrieveKnowledge } from './knowledge'
import { generateReply } from './generate'
import { buildSystemPrompt, CRM_TOOLS } from './defaults'
import { buildHandoffSummary } from './handoff'
import { logAiUsage } from './usage'
import { latestUserMessage } from './query'
import { engineSendText, engineSendMedia } from '@/lib/flows/meta-send'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { analyzeVoucherWithAI } from './vision'

interface DispatchArgs {
  /** Tenancy key — drives config, contact, and whatsapp_config lookups. */
  accountId: string
  conversationId: string
  contactId: string
  /** The account's WhatsApp config owner, used for the outbound send's
   *  audit columns (mirrors how the flow runner passes it through). */
  configOwnerUserId: string
}

/**
 * AI auto-reply for a freshly-arrived inbound message.
 *
 * Invoked from the WhatsApp webhook's `after()` block, only when no
 * deterministic flow consumed the message (flows win). Mirrors the flow
 * runner's contract: it owns its try/catch and NEVER throws — a failing
 * or slow LLM call must not affect the webhook's 200 to Meta.
 *
 * Eligibility gates (any → silent no-op):
 *   - AI off / auto-reply disabled for the account
 *   - a human agent is assigned (they own the thread)
 *   - auto-reply was disabled for this conversation (prior handoff)
 *   - the per-conversation reply cap is reached
 *   - there's nothing to reply to
 *
 * The 24h WhatsApp session window is inherently open here — we're
 * reacting to a customer message that just landed — so no separate
 * window check is needed.
 */
export async function dispatchInboundToAiReply(
  args: DispatchArgs,
): Promise<void> {
  const { accountId, conversationId, contactId, configOwnerUserId } = args

  try {
    const db = supabaseAdmin()

    const config = await loadAiConfig(db, accountId)
    if (!config || !config.autoReplyEnabled) return

    // Deterministic, user-configured responders win over the LLM — the
    // caller already excludes messages a Flow consumed. Message-level
    // automations (`new_message_received` / `keyword_match`) are
    // dispatched independently for this same inbound and may send their
    // own reply, so if the account has any active one we stand down to
    // avoid double-texting the customer. (Relationship triggers like
    // `first_inbound_message` don't count — they're not per-message
    // auto-responders.)
    const { data: autoResponders } = await db
      .from('automations')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .in('trigger_type', ['new_message_received', 'keyword_match'])
      .limit(1)
    if (autoResponders && autoResponders.length > 0) return

    const { data: conv, error: convErr } = await db
      .from('conversations')
      .select('assigned_agent_id, ai_autoreply_disabled, ai_reply_count')
      .eq('id', conversationId)
      .maybeSingle()
    if (convErr || !conv) return
    if (conv.assigned_agent_id) return // a human owns this thread
    if (conv.ai_autoreply_disabled) return // handed off / turned off here
    // Cheap early-out; the authoritative cap check is the atomic claim
    // below (this read can race a concurrent inbound).
    if (conv.ai_reply_count >= config.autoReplyMaxPerConversation) return

    const messages = await buildConversationContext(db, conversationId)
    if (messages.length === 0) return

    // Account-wide throttle on the shared BYO key. The per-conversation
    // cap bounds one thread; this bounds a burst across many threads (a
    // marketing blast landing 200 replies at once) so we never run the
    // owner's key past the provider's rate limit. Over the limit → skip
    // the auto-reply; the inbound still sits in the inbox for a human.
    const acctLimit = checkRateLimit(
      `ai-autoreply:${accountId}`,
      RATE_LIMITS.aiAutoReplyAccount,
    )
    if (!acctLimit.success) {
      console.warn(
        `[ai auto-reply] account ${accountId} hit the per-account rate limit — skipping this inbound.`,
      )
      return
    }

    // Ground the reply in the account's knowledge base (best-effort).
    const knowledge = await retrieveKnowledge(
      db,
      accountId,
      config,
      latestUserMessage(messages),
    )

    const { data: paymentMethods } = await db
      .from('ai_payment_methods')
      .select('type, bank_name, account_number, cci, holder_name, qr_image_url')
      .eq('account_id', accountId)

    const { data: acct } = await db
      .from('accounts')
      .select('default_currency')
      .eq('id', accountId)
      .maybeSingle()

    const systemPrompt = buildSystemPrompt({
      userPrompt: config.systemPrompt,
      mode: 'auto_reply',
      knowledge,
      config,
      paymentMethods: paymentMethods || [],
      currency: acct?.default_currency,
    })

    // Check if the latest inbound message is an image to trigger OCR
    const { data: latestMsg } = await db
      .from('messages')
      .select('id, content_type, media_url')
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestMsg?.content_type === 'image' && latestMsg.media_url) {
      // 1. Find open deal and temporarily move it to "En revision de pago"
      const { data: openDealRev } = await db
        .from('deals')
        .select('id, pipeline_id')
        .eq('conversation_id', conversationId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        
      if (openDealRev) {
        const { data: revisionStage } = await db
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', openDealRev.pipeline_id)
          .ilike('name', '%revision%')
          .limit(1)
          .maybeSingle()
          
        if (revisionStage) {
          // Fire and forget update so we don't delay OCR too much
          db.from('deals')
            .update({ stage_id: revisionStage.id })
            .eq('id', openDealRev.id)
            .then(() => {}) // ignore
        }
      }

      const ocrData = await analyzeVoucherWithAI(latestMsg.media_url, accountId, latestMsg.id)
      
      if (ocrData) {
        if (ocrData.error === 'DUPLICATE_VOUCHER') {
          messages.push({
            role: 'user',
            content: `[SISTEMA: El cliente envió una imagen de un comprobante de pago, pero el número de operación (${ocrData.operacion}) YA FUE UTILIZADO ANTERIORMENTE. ¡Es un comprobante duplicado o inválido!
Reglas estrictas:
- NUNCA uses la macro [[WIN_DEAL]].
- Informa al cliente amablemente que ese comprobante ya fue registrado anteriormente y que debe enviar uno nuevo o comunicarse con soporte.]`
          })
        } else {
          messages.push({
            role: 'user',
            content: `[SISTEMA: El cliente acaba de enviar un comprobante de pago. Nuestro sistema de Visión (OCR) ha extraído los siguientes datos del comprobante:
${JSON.stringify(ocrData, null, 2)}
            
Por favor, analiza estos datos. Si el monto extraído coincide con lo que el cliente debía pagar, confírmale amablemente que su pago fue exitoso y asegúrate de añadir la macro [[WIN_DEAL]] al final de tu mensaje.
Si el monto no coincide o no es legible, coméntaselo amablemente para que lo verifique, y NO uses la macro [[WIN_DEAL]].]`
          })
        }
      }
    }

    let finalText = ''
    let sendQrType: string | null = null
    let createDealValue: number | null = null
    let winDeal = false
    let updateStageName: string | null = null
    let loseDeal = false

    let loopCount = 0
    while (loopCount < 5) {
      loopCount++
      console.log(`[ai auto-reply] Loop ${loopCount} calling generateReply`)

      const { text, handoff, usage, toolCalls } = await generateReply({
        config,
        systemPrompt,
        messages,
        tools: CRM_TOOLS,
      })

      if (usage) {
        void logAiUsage(db, {
          accountId,
          conversationId,
          mode: 'auto_reply',
          provider: config.provider,
          model: config.model,
          usage,
        })
      }

      if (handoff || (!text && (!toolCalls || toolCalls.length === 0))) {
        // Handoff logic
        const summary = buildHandoffSummary({
          messages,
          replyCount: conv.ai_reply_count ?? 0,
        })
        const update: Record<string, unknown> = {
          ai_autoreply_disabled: true,
          ai_handoff_summary: summary,
        }
        if (config.handoffAgentId && !conv.assigned_agent_id) {
          update.assigned_agent_id = config.handoffAgentId
        }
        await db.from('conversations').update(update).eq('id', conversationId)
        return
      }

      if (toolCalls && toolCalls.length > 0) {
        console.log(`[ai auto-reply] TOOL_CALLS: ${JSON.stringify(toolCalls)}`);
        let shouldLoop = false
        const assistantMessage: import('./types').ChatMessage = {
          role: 'assistant',
          content: text || '',
          tool_calls: toolCalls
        }
        messages.push(assistantMessage)

        for (const tc of toolCalls) {
          try {
            console.log(`[ai auto-reply] EXEC_TOOL: ${tc.function.name} with ${tc.function.arguments}`);
            const args = JSON.parse(tc.function.arguments || '{}') || {}
            switch (tc.function.name) {
              case 'create_deal':
                createDealValue = args.amount !== undefined ? Number(args.amount) : 0
                messages.push({
                  role: 'tool',
                  content: JSON.stringify({ status: 'SUCCESS' }),
                  tool_call_id: tc.id
                })
                shouldLoop = true
                break
              case 'update_crm_stage':
                if (args.stage) updateStageName = args.stage
                messages.push({
                  role: 'tool',
                  content: JSON.stringify({ status: 'SUCCESS' }),
                  tool_call_id: tc.id
                })
                shouldLoop = true
                break
              case 'lose_deal':
                loseDeal = true
                messages.push({
                  role: 'tool',
                  content: JSON.stringify({ status: 'SUCCESS' }),
                  tool_call_id: tc.id
                })
                shouldLoop = true
                break
              case 'send_qr_code':
                if (args.type) sendQrType = args.type.toLowerCase()
                messages.push({
                  role: 'tool',
                  content: JSON.stringify({ status: 'SUCCESS' }),
                  tool_call_id: tc.id
                })
                shouldLoop = true
                break
              case 'buscar_producto':
                const query = args.query || ''
                let dbQuery = db
                  .from('products')
                  .select('name, description, product_variants!inner(name, price, stock, attributes)')
                  .eq('account_id', accountId)
                  
                if (query) {
                  const queryWords = query.split(' ').filter(w => w.length > 2);
                  if (queryWords.length > 0) {
                    const orConditions = queryWords.map(w => `name.ilike.%${w}%,description.ilike.%${w}%`).join(',');
                    dbQuery = dbQuery.or(orConditions)
                  } else {
                    dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                  }
                }
                
                if (args.atributos && typeof args.atributos === 'object') {
                  dbQuery = dbQuery.contains('product_variants.attributes', args.atributos)
                }
                
                const { data: products } = await dbQuery.limit(5)
                
                let resultText = ''
                
                if (products && products.length > 0) {
                  resultText = JSON.stringify({
                    status: 'FOUND',
                    matches: products
                  })
                } else {
                  // Si no hay resultados pero se pidieron atributos específicos, buscar alternativas
                  if (args.atributos && typeof args.atributos === 'object' && query) {
                    const { data: alternatives } = await db
                      .from('products')
                      .select('name, description, product_variants!inner(name, price, stock, attributes)')
                      .eq('account_id', accountId)
                      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                      .limit(5)
                      
                    if (alternatives && alternatives.length > 0) {
                      resultText = JSON.stringify({
                        status: 'NOT_FOUND_BUT_ALTERNATIVES_AVAILABLE',
                        requested: { query, atributos: args.atributos },
                        alternatives
                      })
                    } else {
                      resultText = JSON.stringify({ status: 'NOT_FOUND', requested: { query } })
                    }
                  } else {
                    resultText = JSON.stringify({ status: 'NOT_FOUND', requested: { query } })
                  }
                }
                
                console.log(`[ai auto-reply] TOOL_RESULT: ${resultText}`);
                messages.push({
                  role: 'tool',
                  content: resultText,
                  tool_call_id: tc.id
                })
                shouldLoop = true
                break
            }
          } catch (e) {
            console.error('[ai auto-reply] Error parsing tool call args:', e)
          }
        }

        if (shouldLoop) {
          continue // Let the AI analyze the tool results
        } else {
          finalText = text || ''
          break
        }
      } else {
        console.log(`[ai auto-reply] NO_TOOLS_CALLED. Text: ${text}`);
        finalText = text
        break
      }
    }

    // Atomically claim a reply slot AFTER the agent finishes thinking.
    const { data: claimed, error: claimErr } = await db.rpc(
      'claim_ai_reply_slot',
      {
        conversation_id: conversationId,
        max_replies: config.autoReplyMaxPerConversation,
      },
    )
    if (claimErr) return
    if (claimed !== true) return 

    let qrImageUrl: string | null = null
    if (sendQrType && paymentMethods) {
      const pm = paymentMethods.find(p => p.type === sendQrType)
      if (pm?.qr_image_url) {
        qrImageUrl = pm.qr_image_url
      }
    }

    if (qrImageUrl) {
      // Send as media with caption
      await engineSendMedia({
        accountId,
        userId: configOwnerUserId,
        conversationId,
        contactId,
        kind: 'image',
        link: qrImageUrl,
        caption: finalText,
      })
    } else if (finalText) {
      // Send as text
      await engineSendText({
        accountId,
        userId: configOwnerUserId,
        conversationId,
        contactId,
        text: finalText,
        aiGenerated: true,
      })
    }

    // Process deal creation after sending message
    if (createDealValue !== null && !Number.isNaN(createDealValue)) {
      // Find the first pipeline for this account
      const { data: pipeline } = await db
        .from('pipelines')
        .select('id')
        .eq('user_id', configOwnerUserId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (pipeline) {
        // Find the first stage of that pipeline
        const { data: stage } = await db
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', pipeline.id)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (stage) {
          // Find if there is already an open deal for this conversation
          const { data: existingDeal } = await db
            .from('deals')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (existingDeal) {
            // Update existing deal value
            await db.from('deals').update({
              value: createDealValue,
            }).eq('id', existingDeal.id)
          } else {
            // Find the contact's name for the deal title
            const { data: contact } = await db
              .from('contacts')
              .select('name')
              .eq('id', contactId)
              .maybeSingle()

            await db.from('deals').insert({
              account_id: accountId,
              user_id: configOwnerUserId,
              pipeline_id: pipeline.id,
              stage_id: stage.id,
              contact_id: contactId,
              conversation_id: conversationId,
              title: `Venta por WhatsApp - ${contact?.name || 'Cliente'}`,
              value: createDealValue,
              currency: acct?.default_currency ?? 'USD',
              status: 'open',
            })
          }
        }
      }
    }

    // Process winning a deal
    if (winDeal || loseDeal || updateStageName) {
      // Find the latest open deal for this conversation
      const { data: openDeal } = await db
        .from('deals')
        .select('id, pipeline_id')
        .eq('conversation_id', conversationId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        
      if (openDeal) {
        const updatePayload: Record<string, any> = {}
        
        if (winDeal) {
          updatePayload.status = 'won'
          const { data: ganadoStage } = await db
            .from('pipeline_stages')
            .select('id')
            .eq('pipeline_id', openDeal.pipeline_id)
            .ilike('name', '%Ganado%')
            .limit(1)
            .maybeSingle()
          if (ganadoStage) updatePayload.stage_id = ganadoStage.id
        } else if (loseDeal) {
          updatePayload.status = 'lost'
          const { data: perdidoStage } = await db
            .from('pipeline_stages')
            .select('id')
            .eq('pipeline_id', openDeal.pipeline_id)
            .ilike('name', '%Perdido%')
            .limit(1)
            .maybeSingle()
          if (perdidoStage) updatePayload.stage_id = perdidoStage.id
        } else if (updateStageName) {
          const { data: targetStage } = await db
            .from('pipeline_stages')
            .select('id')
            .eq('pipeline_id', openDeal.pipeline_id)
            .ilike('name', `%${updateStageName}%`)
            .limit(1)
            .maybeSingle()
          if (targetStage) updatePayload.stage_id = targetStage.id
        }
        
        if (Object.keys(updatePayload).length > 0) {
          await db.from('deals').update(updatePayload).eq('id', openDeal.id)
        }
      }
    }
  } catch (err) {
    console.error('[ai auto-reply] dispatch failed:', err)
  }
}
