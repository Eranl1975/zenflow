import { Registration } from './supabase'

interface ExportRow {
  date: string
  time: string
  participant_name: string
  phone_number: string
  registration_status: string
}

export function generateTSV(registrations: (Registration & { class_start_time: string })[]) {
  const header = 'Date\tTime\tParticipant_Name\tPhone_Number\tRegistration_Status'

  const rows: string[] = registrations.map((r) => {
    const dt = new Date(r.class_start_time)
    const date = dt.toLocaleDateString('en-GB') // DD/MM/YYYY
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${date}\t${time}\t${r.full_name}\t${r.phone}\t${r.status}`
  })

  return [header, ...rows].join('\n')
}
