import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST /api/auth/backfill
// Authorization: Bearer <access_token>
// Links existing registrations (matched by phone) to the authenticated user.
// Safe to call multiple times — only updates rows where user_id IS NULL.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = serverClient()
  const token = authHeader.slice(7)

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the user's phone from their profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('phone')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ updated: 0 })
  }

  // Update all legacy registrations for this phone that aren't yet linked
  const { data: updated, error: updateErr } = await supabase
    .from('registrations')
    .update({ user_id: user.id })
    .eq('phone', profile.phone)
    .is('user_id', null)
    .select('id')

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ updated: updated?.length ?? 0 })
}
