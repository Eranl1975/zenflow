import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase is not configured.')
  return createClient(url, key)
}

function notConfigured() {
  return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
}

// GET /api/registrations?phone=xxx — fetch all confirmed registrations for a phone number
export async function GET(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return notConfigured()
  const supabase = serverClient()
  const phone = req.nextUrl.searchParams.get('phone')

  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'confirmed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/registrations — register a user for a class
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return notConfigured()
  const supabase = serverClient()
  const { class_id, full_name, phone } = await req.json()

  if (!class_id || !full_name || !phone) {
    return NextResponse.json({ error: 'class_id, full_name, and phone are required' }, { status: 400 })
  }

  // Check class exists and hasn't started yet
  const { data: cls } = await supabase
    .from('classes')
    .select('max_capacity, start_time')
    .eq('id', class_id)
    .single()

  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  if (new Date(cls.start_time) <= new Date()) {
    return NextResponse.json({ error: 'לא ניתן להירשם לשיעור שכבר התחיל.' }, { status: 409 })
  }

  // Check if a row already exists for this class+phone (confirmed or cancelled)
  const { data: existing } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('class_id', class_id)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'confirmed') {
      return NextResponse.json({ error: 'כבר נרשמת לשיעור זה.' }, { status: 409 })
    }
    // Was cancelled before — re-activate
    const { data: reactivated, error: reErr } = await supabase
      .from('registrations')
      .update({ status: 'confirmed', full_name, registered_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (reErr) return NextResponse.json({ error: reErr.message }, { status: 500 })
    return NextResponse.json(reactivated, { status: 200 })
  }

  // Check capacity (only confirmed count)
  const { count } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', class_id)
    .eq('status', 'confirmed')

  if ((count ?? 0) >= cls.max_capacity) {
    return NextResponse.json({ error: 'השיעור מלא' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('registrations')
    .insert({ class_id, full_name, phone, status: 'confirmed' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/registrations?class_id=xxx&phone=xxx  OR  ?id=xxx
export async function DELETE(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return notConfigured()
  const supabase = serverClient()

  const id = req.nextUrl.searchParams.get('id')
  const classId = req.nextUrl.searchParams.get('class_id')
  const phone = req.nextUrl.searchParams.get('phone')

  let error

  if (id) {
    ;({ error } = await supabase.from('registrations').update({ status: 'cancelled' }).eq('id', id))
  } else if (classId && phone) {
    ;({ error } = await supabase
      .from('registrations')
      .update({ status: 'cancelled' })
      .eq('class_id', classId)
      .eq('phone', phone))
  } else {
    return NextResponse.json({ error: 'id or class_id+phone required' }, { status: 400 })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
