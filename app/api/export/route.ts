import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCSV } from '@/lib/export'

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/export?class_id=xxx&tz=Asia/Jerusalem — download CSV attendance sheet
export async function GET(req: NextRequest) {
  const supabase = serverClient()
  const classId = req.nextUrl.searchParams.get('class_id')
  const timezone = req.nextUrl.searchParams.get('tz') ?? 'UTC'

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

  const now = new Date().toISOString()

  // Only include registrations for upcoming/current classes (same logic as the UI)
  const rows = (data ?? [])
    .filter((r: any) => (r.classes?.start_time ?? '') >= now)
    .map((r: any) => ({
      ...r,
      class_start_time: r.classes?.start_time ?? '',
    }))

  const csvContent = generateCSV(rows, timezone)
  const filename = `attendance-${new Date().toISOString().split('T')[0]}.csv`

  // Prepend UTF-8 BOM as explicit bytes (0xEF 0xBB 0xBF) so Google Sheets,
  // Excel and Numbers all display Hebrew and non-ASCII characters correctly
  const body = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(csvContent, 'utf8'),
  ])

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
