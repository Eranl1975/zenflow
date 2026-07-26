'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('נא להזין כתובת אימייל.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'שליחת הקישור נכשלה. נסה שוב.')
        setLoading(false)
        return
      }
    } catch {
      setError('שגיאת רשת. נסה שוב.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  // ---- Success state ----
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: '#E0F2F1' }}>
              🌿
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#455A64' }}>קישור איפוס נשלח</h2>
            <p className="text-sm mb-2" style={{ color: '#78909C', lineHeight: 1.7 }}>
              אם <strong>{email}</strong> רשום במערכת, קישור לאיפוס סיסמה נשלח לתיבת הדואר.
            </p>
            <p className="text-xs mb-6" style={{ color: '#90A4AE' }}>
              לא מצאת? בדוק בתיקיית הספאם / דואר זבל.
            </p>
            <Link href="/login" className="text-teal-600 font-semibold hover:text-teal-700 underline text-sm">
              חזרה לכניסה
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---- Email form ----
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: '#E0F2F1' }}>
            🌿
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#455A64' }}>ZenFlow</h1>
          <p className="text-sm mt-1" style={{ color: '#78909C' }}>איפוס סיסמה</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#455A64' }}>שכחת סיסמה?</h2>
          <p className="text-sm mb-5" style={{ color: '#78909C' }}>הזן את כתובת האימייל שלך ונשלח קישור לאיפוס.</p>

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600 mb-4">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>אימייל</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                placeholder="example@email.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors"
            >
              {loading ? 'שולח...' : 'שלח קישור איפוס'}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: '#78909C' }}>
            <Link href="/login" className="text-teal-600 underline hover:text-teal-700">חזרה לכניסה</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
