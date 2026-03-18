import { Registration } from './supabase'

function csvField(value: string): string {
  // Wrap in quotes if value contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCSV(registrations: (Registration & { class_start_time: string })[]) {
  const header = 'Date,Time,Participant_Name,Phone_Number,Registration_Status'

  const rows: string[] = registrations.map((r) => {
    const dt = new Date(r.class_start_time)
    const date = dt.toLocaleDateString('en-GB') // DD/MM/YYYY
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return [date, time, r.full_name, r.phone, r.status].map(csvField).join(',')
  })

  // UTF-8 BOM (\uFEFF) ensures Excel/Numbers recognise Hebrew and other non-ASCII text correctly
  return '\uFEFF' + [header, ...rows].join('\n')
}
