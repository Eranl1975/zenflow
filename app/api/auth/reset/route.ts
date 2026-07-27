import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { email } = (await req.json()) as { email?: string }
  const trimmed = email?.trim().toLowerCase()
  if (!trimmed) {
    return NextResponse.json({ error: 'כתובת אימייל נדרשת.' }, { status: 400 })
  }

  // Clean admin client — NO flowType override (was 'implicit' before, which
  // may have interfered with how GoTrue generates recovery email links)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const origin =
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://zenflow-nine-blond.vercel.app'

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) {
    console.error('[reset] resetPasswordForEmail error:', error.message, error.status)
    if (
      error.message?.includes('rate') ||
      error.message?.includes('60 seconds') ||
      error.message?.includes('security purposes') ||
      error.status === 429
    ) {
      return NextResponse.json(
        { error: 'ניתן לשלוח בקשת איפוס פעם ב-60 שניות. נסה שוב בעוד דקה.' },
        { status: 429 },
      )
    }
    // Anti-enumeration: don't reveal whether the email exists
  }

  return NextResponse.json({ success: true })
}
