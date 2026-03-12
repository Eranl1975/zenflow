// SMS stub — wire up Twilio when ready
// npm install twilio
// import twilio from 'twilio'

export interface SMSPayload {
  to: string
  message: string
}

export async function sendSMS(payload: SMSPayload): Promise<void> {
  // TODO: Replace with actual Twilio integration:
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  // await client.messages.create({ body: payload.message, from: process.env.TWILIO_FROM, to: payload.to })
  console.log(`[SMS STUB] To: ${payload.to} | Message: ${payload.message}`)
}

export function buildReminderMessage(className: string, startTime: string, instructor: string) {
  const dt = new Date(startTime)
  const time = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const date = dt.toLocaleDateString('he-IL')
  return `ZenFlow: Reminder — "${className}" with ${instructor} starts at ${time} on ${date}. See you there! 🌿`
}

export function buildCancellationMessage(className: string, startTime: string) {
  const dt = new Date(startTime)
  const time = dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return `ZenFlow: Unfortunately "${className}" at ${time} has been cancelled. We hope to see you at the next class!`
}
