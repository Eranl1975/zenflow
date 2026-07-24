'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type Stage = 'verifying' | 'ready' | 'expired' | 'invalid'

function ResetPasswordForm() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setStage('invalid')
      return
    }

    // Standalone implicit-flow client — NOT using getSupabaseClient()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          flowType: 'implicit',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )

    let cancelled = false

    // Manual hash fragment parsing — @supabase/ssr may ignore implicit tokens
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: sessError }) => {
            if (!cancelled && !sessError) setStage('ready')
          })
        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    // Subscribe to auth state — catches PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStage('ready')
      }
    })

    // Immediate session check as fallback
    supabase.auth.getSession().then((res) => {
      if (cancelled) return
      if (res.data.session) setStage('ready')
    })

    // Timeout — if no session within 10s the link is expired/invalid
    const timer = setTimeout(() => {
      setStage((prev) => (prev === 'verifying' ? 'expired' : prev))
    }, 10_000)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.')
      return
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )

    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      if (
        authError.message?.toLowerCase().includes('expired') ||
        authError.message?.toLowerCase().includes('invalid')
      ) {
        setStage('invalid')
        return
      }
      setError(authError.message ?? 'עדכון הסיסמה נכשל. נסה שוב.')
      setLoading(false)
      return
    }

    // Sign out so user must log in with the new password (do NOT set zf_session)
    await supabase.auth.signOut()
    router.push('/login?message=password_updated')
  }

  // ---- Verifying ----
  if (stage === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
              style={{ backgroundColor: '#E0F2F1' }}
            >
              🌿
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            </div>
            <p className="text-sm" style={{ color: '#78909C' }}>
              מאמת את קישור האיפוס...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---- Expired / Invalid ----
  if (stage === 'expired' || stage === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
              style={{ backgroundColor: '#E0F2F1' }}
            >
              🌿
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#455A64' }}>
              {stage === 'expired' ? 'הקישור פג תוקף' : 'קישור איפוס לא תקין'}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#78909C', lineHeight: 1.7 }}>
              {stage === 'expired'
                ? 'קישור איפוס הסיסמה פג תוקף. הקישור תקף לשעה אחת בלבד.'
                : 'קישור איפוס הסיסמה אינו תקין יותר.'}
              <br />
              נא לבקש קישור חדש.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
            >
              בקש קישור חדש
            </Link>
            <p className="text-center text-xs mt-4" style={{ color: '#78909C' }}>
              <Link href="/login" className="text-teal-600 underline hover:text-teal-700">
                חזרה לכניסה
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---- Ready: password form ----
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ backgroundColor: '#E0F2F1' }}
          >
            🌿
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#455A64' }}>ZenFlow</h1>
          <p className="text-sm mt-1" style={{ color: '#78909C' }}>איפוס סיסמה</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#455A64' }}>
            בחר סיסמה חדשה
          </h2>
          <p className="text-sm mb-5" style={{ color: '#78909C' }}>
            הזן סיסמה חדשה לחשבונך.
          </p>

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600 mb-4">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                סיסמה חדשה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: '#455A64' }}>
                אימות סיסמה
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
              />
            </div>

            <p className="text-xs" style={{ color: '#78909C' }}>
              לפחות 6 תווים
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60 transition-colors"
            >
              {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: '#78909C' }}>
            <Link href="/login" className="text-teal-600 underline hover:text-teal-700">
              חזרה לכניסה
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
