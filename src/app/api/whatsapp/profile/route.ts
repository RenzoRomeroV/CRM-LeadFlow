import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  getWhatsAppBusinessProfile,
  updateWhatsAppBusinessProfile,
  uploadResumableMedia,
} from '@/lib/whatsapp/meta-api'

async function resolveAccountId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'No account linked' }, { status: 403 })
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 404 })
    }

    let accessToken: string
    try {
      accessToken = decrypt(config.access_token)
    } catch (err) {
      return NextResponse.json({ error: 'Token corrupted' }, { status: 500 })
    }

    try {
      const profile = await getWhatsAppBusinessProfile({
        phoneNumberId: config.phone_number_id,
        accessToken,
      })
      return NextResponse.json({ profile })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      return NextResponse.json({ error: `Meta API error: ${message}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in WhatsApp profile GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'No account linked' }, { status: 403 })
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 404 })
    }

    let accessToken: string
    try {
      accessToken = decrypt(config.access_token)
    } catch (err) {
      return NextResponse.json({ error: 'Token corrupted' }, { status: 500 })
    }

    const formData = await request.formData()
    const payload: any = {}

    const about = formData.get('about') as string | null
    const address = formData.get('address') as string | null
    const description = formData.get('description') as string | null
    const email = formData.get('email') as string | null
    const websites = formData.getAll('websites') as string[]
    const vertical = formData.get('vertical') as string | null
    const profilePicture = formData.get('profile_picture') as File | null

    if (about !== null) payload.about = about
    if (address !== null) payload.address = address
    if (description !== null) payload.description = description
    if (email !== null) payload.email = email
    if (websites.length > 0) payload.websites = websites
    if (vertical !== null) payload.vertical = vertical

    if (profilePicture && profilePicture.size > 0) {
      const appId = process.env.META_APP_ID
      if (!appId) {
        return NextResponse.json({ error: 'META_APP_ID is required in .env to upload pictures' }, { status: 400 })
      }

      const buffer = await profilePicture.arrayBuffer()
      try {
        const { handle } = await uploadResumableMedia({
          appId,
          accessToken,
          fileName: profilePicture.name,
          mimeType: profilePicture.type,
          bytes: new Uint8Array(buffer),
        })
        payload.profile_picture_handle = handle
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Meta Upload API error'
        console.error('Failed to upload profile picture to Meta:', message)
        return NextResponse.json({ error: `Failed to upload picture: ${message}` }, { status: 400 })
      }
    }

    try {
      await updateWhatsAppBusinessProfile({
        phoneNumberId: config.phone_number_id,
        accessToken,
        payload,
      })
      return NextResponse.json({ success: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      return NextResponse.json({ error: `Meta API error: ${message}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in WhatsApp profile POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
