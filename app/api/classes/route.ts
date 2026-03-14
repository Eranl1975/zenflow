import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase is not configured. Add .env.local with your keys.')
  return createClient(url, key)
}

function notConfigured() {
  return NextResponse.json({ error: 'Supabase is not configured. See .env.local.example.' }, { status: 503 })
}

// GET /api/classes — list only future classes with registration counts
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return notConfigured()
  const supabase = serverClient()

  const { data: classes, error } = await supabase
    .from('classes')
    .select('*, registrations(count)')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = classes.map((c: any) => ({
    ...c,
    registration_count: c.registrations?.[0]?.count ?? 0,
    registrations: undefined,
  }))

  return NextResponse.json(result)
}

// POST /api/classes — create a new class
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return notConfigured()
  const supabase = serverClient()
  const body = await req.json()
  const { title, instructor, start_time, duration_minutes } = body

  if (!title || !start_time) {
    return NextResponse.json({ error: 'title and start_time are required' }, { status: 400 })
  }

  const dur = duration_minutes || 60
  const newStart = new Date(start_time).getTime()
  const newEnd = newStart + dur * 60000

  // Overlap check in application layer
  const { data: existing } = await supabase.from('classes').select('start_time, duration_minutes')
  const overlap = (existing ?? []).some((c: any) => {
    const s = new Date(c.start_time).getTime()
    const e = s + (c.duration_minutes || 60) * 60000
    return newStart < e && newEnd > s
  })
  if (overlap) {
    return NextResponse.json({ error: 'A class already exists at this time. Please choose a different slot.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({ title, instructor: instructor || 'Studio', start_time, duration_minutes: dur })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/classes?id=xxx
export async function DELETE(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return notConfigured()
  const supabase = serverClient()
  const id = req.nextUrl.searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase.from('classes').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
