import { Registration } from './supabase'

function csvField(value: string): string {
  // Wrap in quotes if value contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes(';')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatInTz(isoString: string, timezone: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: timezone }).format(new Date(isoString))
  } catch {
    return new Intl.DateTimeFormat('en-GB', opts).format(new Date(isoString))
  }
}

export function generateCSV(
  registrations: (Registration & { class_start_time: string; class_title?: string; class_instructor?: string })[],
  timezone = 'UTC',
  includeClassDetails = false
) {
  const header = includeClassDetails
    ? 'Class_Name,Instructor,Class_Date,Class_Time,Participant_Name,Phone_Number,Registration_Status,Registered_At'
    : 'Class_Date,Class_Time,Participant_Name,Phone_Number,Registration_Status,Registered_At'

  const rows: string[] = registrations.map((r) => {
    const classDate = formatInTz(r.class_start_time, timezone, { day: '2-digit', month: '2-digit', year: 'numeric' })
    const classTime = formatInTz(r.class_start_time, timezone, { hour: '2-digit', minute: '2-digit', hour12: false })
    const registeredAt = r.registered_at
      ? formatInTz(r.registered_at, timezone, {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
      : ''

    if (includeClassDetails) {
      return [
        r.class_title ?? '',
        r.class_instructor ?? '',
        classDate,
        classTime,
        r.full_name,
        r.phone,
        r.status,
        registeredAt,
      ].map(csvField).join(',')
    }

    return [classDate, classTime, r.full_name, r.phone, r.status, registeredAt].map(csvField).join(',')
  })

  return [header, ...rows].join('\r\n')
}
