import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { email } = (await req.json()) as { email?: string }
  const trimmed = email?.trim().toLowerCase()
  if (!trimmed) {
    return NextResponse.json({ error: 'כתובת אימייל נדרשת.' }, { status: 400 })
  }

  // Standalone implicit-flow client (anon key, no session persistence)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )

  const origin =
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://zenflow-nine-blond.vercel.app'

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${origin}/reset-password`,
  })

  // Always return success to prevent email enumeration.
  // Only surface rate-limit errors.
  if (error?.message?.includes('rate')) {
    return NextResponse.json(
      { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' },
      { status: 429 },
    )
  }

  return NextResponse.json({ success: true })
}
