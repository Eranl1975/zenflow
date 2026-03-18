import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCSV } from '@/lib/export'

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/export?class_id=xxx (optional) — download TSV attendance sheet
export async function GET(req: NextRequest) {
  const supabase = serverClient()
  const classId = req.nextUrl.searchParams.get('class_id')

  let query = supabase
    .from('registrations')
    .select('*, classes(start_time, title)')
    .eq('status', 'confirmed')
    .order('registered_at', { ascending: true })

  if (classId) {
    query = query.eq('class_id', classId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    class_start_time: r.classes?.start_time ?? '',
  }))

  const csv = generateCSV(rows)
  const filename = `attendance-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
