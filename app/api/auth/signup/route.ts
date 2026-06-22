import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  // autoRefreshToken / persistSession disabled for server-side usage
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/auth/signup
// Body: { email, phone, password, display_name? }
// Creates the Supabase Auth user (auto-confirmed) and user_profiles row.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { email, phone, password, display_name } = await req.json()

  if (!email || !phone || !password) {
    return NextResponse.json({ error: 'email, phone, ו-password הם שדות חובה.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים.' }, { status: 400 })
  }

  const supabase = adminClient()

  // Check if phone is already taken
  const { data: existingPhone } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('phone', phone.trim())
    .maybeSingle()

  if (existingPhone) {
    return NextResponse.json({ error: 'מספר הטלפון כבר רשום במערכת.' }, { status: 409 })
  }

  // Create auth user — email_confirm: true bypasses email confirmation step
  const { data: userData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr) {
    const msg = authErr.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return NextResponse.json({ error: 'כתובת האימייל כבר רשומה במערכת.' }, { status: 409 })
    }
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  // Create profile (linked to auth user)
  const { error: profileErr } = await supabase.from('user_profiles').insert({
    id: userData.user.id,
    email,
    phone: phone.trim(),
    display_name: display_name?.trim() || null,
  })

  if (profileErr) {
    // Rollback: remove the auth user so the client can retry
    await supabase.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
