'use client'

import { useState, useEffect } from 'react'
import { Class } from '@/lib/supabase'

interface Props {
  cls: Class
  onClose: () => void
  onRegistered: () => void
}

const LS_NAME = 'zenflow_name'
const LS_PHONE = 'zenflow_phone'

export default function RegistrationModal({ cls, onClose, onRegistered }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Smart memory: pre-fill from LocalStorage
  useEffect(() => {
    setName(localStorage.getItem(LS_NAME) ?? '')
    setPhone(localStorage.getItem(LS_PHONE) ?? '')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: cls.id, full_name: name.trim(), phone: phone.trim() }),
    })

    if (res.ok) {
      localStorage.setItem(LS_NAME, name.trim())
      localStorage.setItem(LS_PHONE, phone.trim())
      setSuccess(true)
      setTimeout(onRegistered, 1500)
    } else {
      const data = await res.json()
      setError(data.error ?? 'ההרשמה נכשלה. נסה שוב.')
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-3xl">
              ✓
            </div>
            <p className="text-lg font-semibold text-teal-600">נרשמת בהצלחה!</p>
            <p className="mt-1 text-sm text-slate-500">נתראה ב{cls.title} 🌿</p>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-700">הצטרף לשיעור</h2>
              <p className="text-sm text-slate-500">{cls.title}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">שם מלא</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="השם שלך"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">מספר טלפון</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="050-0000000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'רושם...' : 'אישור'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
