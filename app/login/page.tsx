'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, getSession, backfillRegistrations } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sign-in form
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Sign-up form
  const [suEmail, setSuEmail] = useState('')
  const [suPhone, setSuPhone] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suName, setSuName] = useState('')

  // If already authenticated, go straight to the activity screen
  useEffect(() => {
    getSession().then(session => {
      if (session) router.replace('/')
    })
  }, [router])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await signIn(siEmail.trim(), siPassword)
    if (err || !data?.session) {
      setError(err?.message ?? 'הכניסה נכשלה. בדוק את הפרטים ונסה שוב.')
      setLoading(false)
      return
    }
    // Backfill historical registrations by phone
    await backfillRegistrations(data.session.access_token)
    router.replace('/')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (suPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.')
      return
    }
    setLoading(true)
    const { data, error: err } = await signUp(
      suEmail.trim(),
      suPhone.trim(),
      suPassword,
      suName.trim() || undefined
    )
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    // Backfill historical registrations after signup
    const session = (data as any)?.session
    if (session?.access_token) {
      await backfillRegistrations(session.access_token)
    }
    router.replace('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ backgroundColor: '#E0F2F1' }}
          >
            🌿
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#455A64' }}>ZenFlow</h1>
          <p className="text-sm mt-1" style={{ color: '#78909C' }}>Pilates Studio Schedule</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-100">
            <button
              onClick={() => { setTab('signin'); setError('') }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                tab === 'signin'
                  ? 'border-b-2 border-teal-500 text-teal-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              כניסה
            </button>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                tab === 'signup'
                  ? 'border-b-2 border-teal-500 text-teal-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              הרשמה
            </button>
          </div>

          {/* Sign-In Form */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                  אימייל
                </label>
                <input
                  type="email"
                  value={siEmail}
                  onChange={e => setSiEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="example@email.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                  סיסמה
                </label>
                <input
                  type="password"
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors"
              >
                {loading ? 'מתחבר...' : 'כניסה'}
              </button>

              <p className="text-center text-xs" style={{ color: '#78909C' }}>
                אין לך חשבון?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('signup'); setError('') }}
                  className="text-teal-600 underline hover:text-teal-700"
                >
                  הרשמה כאן
                </button>
              </p>
            </form>
          )}

          {/* Sign-Up Form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                  שם מלא <span className="text-slate-400 font-normal">(אופציונלי)</span>
                </label>
                <input
                  type="text"
                  value={suName}
                  onChange={e => setSuName(e.target.value)}
                  autoComplete="name"
                  placeholder="השם שלך"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                  אימייל
                </label>
                <input
                  type="email"
                  value={suEmail}
                  onChange={e => setSuEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="example@email.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                  מספר טלפון
                </label>
                <input
                  type="tel"
                  value={suPhone}
                  onChange={e => setSuPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="050-0000000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                  סיסמה <span className="text-slate-400 font-normal">(לפחות 6 תווים)</span>
                </label>
                <input
                  type="password"
                  value={suPassword}
                  onChange={e => setSuPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors"
              >
                {loading ? 'נרשם...' : 'צור חשבון'}
              </button>

              <p className="text-center text-xs" style={{ color: '#78909C' }}>
                יש לך כבר חשבון?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setError('') }}
                  className="text-teal-600 underline hover:text-teal-700"
                >
                  כניסה כאן
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
