import { supabaseAdmin } from './admin-client'
import { loadAiConfig } from './config'
import { buildConversationContext } from './context'
import { retrieveKnowledge } from './knowledge'
import { generateReply } from './generate'
import { buildSystemPrompt } from './defaults'
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
      const ocrData = await analyzeVoucherWithAI(latestMsg.media_url, accountId, latestMsg.id)
      
      if (ocrData) {
        if (ocrData.error === 'DUPLICATE_VOUCHER') {
          messages.push({
            role: 'system',
            content: `El cliente envió una imagen de un comprobante de pago, pero el número de operación (${ocrData.operacion}) YA FUE UTILIZADO ANTERIORMENTE. ¡Es un comprobante duplicado o inválido!
Reglas estrictas:
- NUNCA uses la macro [[WIN_DEAL]].
- Informa al cliente amablemente que ese comprobante ya fue registrado anteriormente y que debe enviar uno nuevo o comunicarse con soporte.`
          })
        } else {
          messages.push({
            role: 'system',
            content: `El cliente envió una imagen de un comprobante de pago. La IA de Visión extrajo los siguientes datos del comprobante:
${JSON.stringify(ocrData, null, 2)}
            
Reglas estrictas para comprobantes:
1. Revisa si el "monto" extraído coincide exactamente con el monto total que se le indicó al cliente a pagar.
2. Si el monto coincide, responde confirmando el pago exitosamente de manera amable Y AGREGA OBLIGATORIAMENTE la macro [[WIN_DEAL]] al final de tu respuesta. Ejemplo: "¡Pago confirmado! Tu pedido ha sido procesado... [[WIN_DEAL]]".
3. Si el monto NO coincide o no se encontró, dile amablemente al cliente que el monto del comprobante (S/${ocrData.monto}) no coincide con el esperado, o que la imagen no es legible, y pide que lo verifique. NO uses la macro [[WIN_DEAL]].`
          })
        }
      }
    }

    const { text, handoff, usage } = await generateReply({
      config,
      systemPrompt,
      messages,
    })

    // Record token spend on the account's BYO key. Fire-and-forget so it
    // never adds latency to the customer-facing send: `logAiUsage`
    // swallows its own errors, so the floating promise can't reject.
    // Logged regardless of handoff — the provider call happened either
    // way.
    void logAiUsage(db, {
      accountId,
      conversationId,
      mode: 'auto_reply',
      provider: config.provider,
      model: config.model,
      usage,
    })

    if (handoff || !text) {
      // The model can't (or shouldn't) answer — stop auto-replying on
      // this thread and hand it to a human. We (a) pause the bot here
      // (sticky until re-enabled), (b) route the conversation to the
      // configured handoff agent — null leaves it in the shared queue —
      // and (c) leave a short internal note so whoever picks it up has
      // context. Assigning fires the `on_conversation_assigned` trigger,
      // which notifies the agent.
      const summary = buildHandoffSummary({
        messages,
        replyCount: conv.ai_reply_count ?? 0,
      })
      const update: Record<string, unknown> = {
        ai_autoreply_disabled: true,
        ai_handoff_summary: summary,
      }
      // Only set the assignee when a target is configured AND the thread
      // isn't already owned — never stomp an existing human assignment.
      if (config.handoffAgentId && !conv.assigned_agent_id) {
        update.assigned_agent_id = config.handoffAgentId
      }
      await db.from('conversations').update(update).eq('id', conversationId)
      return
    }

    // Atomically claim a reply slot: the cap check + increment happen in
    // one UPDATE, so concurrent inbounds can never overshoot the cap. If
    // another inbound just took the last slot, `claimed` is false and we
    // skip the send. (We consume a slot slightly before the send lands —
    // fail-safe: under-reply rather than over-reply.)
    const { data: claimed, error: claimErr } = await db.rpc(
      'claim_ai_reply_slot',
      {
        conversation_id: conversationId,
        max_replies: config.autoReplyMaxPerConversation,
      },
    )
    if (claimErr) {
      // A real error here (vs. losing the cap race) is almost always a
      // deploy issue — e.g. `claim_ai_reply_slot` not EXECUTE-able by the
      // service role, or the migration not applied. Log it loudly: a
      // silent return makes "auto-reply never fires" undiagnosable.
      console.error('[ai auto-reply] claim_ai_reply_slot failed:', claimErr)
      return
    }
    if (claimed !== true) return // lost the per-conversation cap race

    let finalText = text
    let sendQrType: string | null = null
    let createDealValue: number | null = null
    let winDeal = false

    // Look for [[WIN_DEAL]]
    const winMatch = finalText.match(/\[\[WIN_DEAL\]\]/i)
    if (winMatch) {
      winDeal = true
      finalText = finalText.replace(/\[\[WIN_DEAL\]\]/gi, '').trim()
    }

    // Look for [[CREATE_DEAL:value]]
    const dealMatch = finalText.match(/\[\[CREATE_DEAL:([\d.]+)\]\]/i)
    if (dealMatch) {
      createDealValue = parseFloat(dealMatch[1])
      finalText = finalText.replace(/\[\[CREATE_DEAL:[\d.]+\]\]/gi, '').trim()
    }

    // Look for [[SEND_QR:yape]] or [[SEND_QR:plin]]
    const qrMatch = finalText.match(/\[\[SEND_QR:(yape|plin)\]\]/i)
    if (qrMatch) {
      sendQrType = qrMatch[1].toLowerCase()
      // Remove the macro from the text that the user will see
      finalText = finalText.replace(/\[\[SEND_QR:(?:yape|plin)\]\]/gi, '').trim()
    }

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
    } else {
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

    // Process winning a deal
    if (winDeal) {
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
        // Try to find a stage named "Ganado" to move it to
        const { data: ganadoStage } = await db
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', openDeal.pipeline_id)
          .ilike('name', '%Ganado%')
          .limit(1)
          .maybeSingle()
          
        const updatePayload: Record<string, any> = { status: 'won' }
        if (ganadoStage) {
          updatePayload.stage_id = ganadoStage.id
        }
        
        await db
          .from('deals')
          .update(updatePayload)
          .eq('id', openDeal.id)
      }
    }
  } catch (err) {
    console.error('[ai auto-reply] dispatch failed:', err)
  }
}
