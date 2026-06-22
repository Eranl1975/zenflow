'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

interface HistoryEntry {
  id: string
  class_id: string
  full_name: string
  phone: string
  registered_at: string
  status: string
  classes: {
    id: string
    title: string
    instructor: string
    start_time: string
    duration_minutes: number
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const session = await getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/history', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'טעינת ההיסטוריה נכשלה.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setEntries(data)
      setLoading(false)
    }

    load()
  }, [router])

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isPast(iso: string) {
    return new Date(iso) < new Date()
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            ← חזרה ללוח הזמנים
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: '#E0F2F1' }}
            >
              🌿
            </div>
            <span className="text-sm font-semibold" style={{ color: '#455A64' }}>ZenFlow</span>
          </div>
        </div>

        <h1 className="mb-6 text-xl font-bold" style={{ color: '#455A64' }}>
          ההיסטוריה שלי
        </h1>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm border border-gray-100">
            <div className="mb-3 text-4xl">📋</div>
            <p className="text-sm font-medium" style={{ color: '#455A64' }}>עדיין לא נרשמת לשיעורים</p>
            <p className="mt-1 text-xs" style={{ color: '#78909C' }}>
              לאחר הרשמה לשיעור, הוא יופיע כאן
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
            >
              לחיפוש שיעורים
            </Link>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map(entry => {
              const past = isPast(entry.classes.start_time)
              const confirmed = entry.status === 'confirmed'
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
                  style={{ opacity: past && !confirmed ? 0.7 : 1 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm" style={{ color: '#455A64' }}>
                        {entry.classes.title}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: '#78909C' }}>
                        מדריך/ה: {entry.classes.instructor}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        confirmed
                          ? 'bg-teal-50 text-teal-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {confirmed ? 'מאושר' : 'בוטל'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#546E7A' }}>
                      <span>📅</span>
                      <span>
                        <span className="font-medium">מועד השיעור:</span>{' '}
                        {formatDateTime(entry.classes.start_time)}
                        {past && (
                          <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                            עבר
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#546E7A' }}>
                      <span>🕐</span>
                      <span>
                        <span className="font-medium">נרשמת בתאריך:</span>{' '}
                        {formatDateTime(entry.registered_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
