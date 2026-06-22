import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET /api/history
// Authorization: Bearer <access_token>
// Returns the authenticated user's registrations joined with class info.
// Includes both registrations linked by user_id AND legacy ones by phone.
// Security: token validated server-side; no cross-user data leakage possible.
export async function GET(req: NextRequest) {
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

  // Get user's phone for legacy registration lookup
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('phone')
    .eq('id', user.id)
    .single()

  const selectFields = 'id, full_name, phone, registered_at, status, class_id, classes(id, title, instructor, start_time, duration_minutes)'

  // Registrations explicitly linked to this user account
  const { data: byUserId, error: e1 } = await supabase
    .from('registrations')
    .select(selectFields)
    .eq('user_id', user.id)
    .order('registered_at', { ascending: false })

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  // Legacy registrations matched by phone (not yet linked to user_id)
  let byPhone: unknown[] = []
  if (profile) {
    const { data, error: e2 } = await supabase
      .from('registrations')
      .select(selectFields)
      .eq('phone', profile.phone)
      .is('user_id', null)
      .order('registered_at', { ascending: false })
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    byPhone = data ?? []
  }

  // Merge and sort by registration date (most recent first)
  // The two sets are mutually exclusive (user_id IS NULL vs IS NOT NULL),
  // so no deduplication is needed.
  const merged = [...(byUserId ?? []), ...byPhone].sort(
    (a: any, b: any) =>
      new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
  )

  return NextResponse.json(merged)
}
