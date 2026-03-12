import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/registrations — register a user for a class
export async function POST(req: NextRequest) {
  const supabase = serverClient()
  const { class_id, full_name, phone } = await req.json()

  if (!class_id || !full_name || !phone) {
    return NextResponse.json({ error: 'class_id, full_name, and phone are required' }, { status: 400 })
  }

  // Check capacity
  const { count } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', class_id)
    .eq('status', 'confirmed')

  const { data: cls } = await supabase
    .from('classes')
    .select('max_capacity, title')
    .eq('id', class_id)
    .single()

  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  if ((count ?? 0) >= cls.max_capacity) {
    return NextResponse.json({ error: 'Class is full' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('registrations')
    .insert({ class_id, full_name, phone, status: 'confirmed' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You are already registered for this class.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/registrations?id=xxx — cancel a registration
export async function DELETE(req: NextRequest) {
  const supabase = serverClient()
  const id = req.nextUrl.searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
