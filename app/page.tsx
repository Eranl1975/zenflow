'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseClient, isSupabaseConfigured, Class, UserProfile } from '@/lib/supabase'
import { getUserProfile, doSignOut } from '@/lib/auth'
import ClassCard from '@/components/ClassCard'
import CreateClassForm from '@/components/CreateClassForm'

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? 'admin'

function SetupBanner() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="w-full max-w-md rounded-2xl border border-teal-200 bg-white p-8 shadow-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-4xl" style={{ backgroundColor: '#E0F2F1' }}>
          🌿
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#455A64' }}>ZenFlow</h1>
        <p className="text-sm mb-6" style={{ color: '#78909C' }}>
          Supabase is not configured yet. Create a <code className="rounded bg-gray-100 px-1">.env.local</code> file in the project root.
        </p>
        <div className="rounded-xl bg-gray-50 p-4 text-left text-xs font-mono" style={{ color: '#455A64' }}>
          <p className="text-gray-400 mb-2"># zenflow/.env.local</p>
          <p>NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</p>
          <p>SUPABASE_SERVICE_ROLE_KEY=your-service-role-key</p>
          <p>NEXT_PUBLIC_ADMIN_SECRET=your-secret</p>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get('admin') === ADMIN_SECRET

  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(isAdmin)
  const [userRegs, setUserRegs] = useState<Map<string, string>>(new Map())
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const fetchClasses = useCallback(async () => {
    const res = await fetch('/api/classes')
    if (res.ok) setClasses(await res.json())
    setLoading(false)
  }, [])

  const fetchUserRegs = useCallback(async () => {
    const phone = localStorage.getItem('zenflow_phone')
    if (!phone) return
    const res = await fetch(`/api/registrations?phone=${encodeURIComponent(phone)}`)
    if (res.ok) {
      const data = await res.json()
      const map = new Map<string, string>()
      data.forEach((r: { class_id: string; id: string }) => map.set(r.class_id, r.id))
      setUserRegs(map)
    }
  }, [])

  // Classes + Realtime — starts immediately, no auth gate
  useEffect(() => {
    fetchClasses()
    fetchUserRegs()

    const client = getSupabaseClient()
    if (!client) return

    const channel = client
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchClasses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => {
        fetchClasses()
        fetchUserRegs()
      })
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [fetchClasses, fetchUserRegs])

  // Auth — getSession() for fast initial check, onAuthStateChange for reactive updates
  useEffect(() => {
    if (isAdmin) return // Admin: no auth needed, authChecked already true

    const client = getSupabaseClient()
    if (!client) { setAuthChecked(true); return }

    async function initAuth() {
      // sessionStorage is cleared when the window/tab closes.
      // Require the flag set by the login page → forces login on every fresh open.
      if (!sessionStorage.getItem('zf_session')) {
        router.replace('/login')
        return
      }
      try {
        const { data: { session } } = await client!.auth.getSession()
        if (!session?.user) {
          sessionStorage.removeItem('zf_session')
          router.replace('/login')
          return
        }
        const profile = await getUserProfile(session.user.id)
        if (profile) {
          setUserProfile(profile)
          localStorage.setItem('zenflow_phone', profile.phone)
          if (profile.display_name) localStorage.setItem('zenflow_name', profile.display_name)
          fetchUserRegs()
          setAuthChecked(true)
        } else {
          sessionStorage.removeItem('zf_session')
          router.replace('/login')
        }
      } catch {
        sessionStorage.removeItem('zf_session')
        router.replace('/login')
      }
    }

    initAuth()

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('zf_session')
        setAuthChecked(false)
        setUserProfile(null)
        setUserRegs(new Map())
        router.replace('/login')
      } else if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profile = await getUserProfile(session.user.id)
          if (profile) {
            setUserProfile(profile)
            localStorage.setItem('zenflow_phone', profile.phone)
            if (profile.display_name) localStorage.setItem('zenflow_name', profile.display_name)
            fetchUserRegs()
            setAuthChecked(true)
          }
        } catch { /* ignore */ }
      }
    })

    return () => { subscription.unsubscribe() }
  }, [router, isAdmin, fetchUserRegs])

  async function handleDelete(id: string) {
    if (!confirm('Delete this class? All registrations will be removed.')) return
    await fetch(`/api/classes?id=${id}`, { method: 'DELETE' })
    fetchClasses()
  }

  async function handleCancel(classId: string) {
    const phone = localStorage.getItem('zenflow_phone')
    if (!phone) return
    if (!confirm('ביטול ההרשמה לשיעור?')) return
    await fetch(`/api/registrations?class_id=${classId}&phone=${encodeURIComponent(phone)}`, { method: 'DELETE' })
    fetchClasses()
    fetchUserRegs()
  }

  async function handleSignOut() {
    try {
      await doSignOut()
    } catch {
      // Force cleanup even if signOut fails
      sessionStorage.removeItem('zf_session')
      localStorage.removeItem('zenflow_phone')
      localStorage.removeItem('zenflow_name')
    }
    // Always redirect, don't rely solely on onAuthStateChange
    router.replace('/login')
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <header style={{ backgroundColor: '#E0F2F1' }} className="border-b border-teal-100">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#455A64' }}>ZenFlow 🌿</h1>
              {userProfile ? (
                <p className="text-sm font-medium" style={{ color: '#78909C' }}>
                  שלום, {userProfile.display_name || userProfile.email}
                </p>
              ) : (
                <p className="text-sm" style={{ color: '#78909C' }}>Pilates Studio Schedule</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isAdmin && (
                <>
                  <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Admin</span>
                  <button
                    onClick={() => {
                      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
                      window.location.href = `/api/export?tz=${encodeURIComponent(tz)}`
                    }}
                    className="rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
                      window.location.href = `/api/export?history=true&tz=${encodeURIComponent(tz)}`
                    }}
                    className="rounded-xl border border-teal-200 bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
                    title="הורדת כל היסטוריית הרישומים כקובץ Excel (CSV)"
                  >
                    📥 היסטוריית רישומים
                  </button>
                </>
              )}

              {userProfile && (
                <>
                  <button
                    onClick={() => router.push('/history')}
                    className="rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
                  >
                    📋 ההיסטוריה שלי
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-gray-50 transition-colors"
                  >
                    יציאה
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {isAdmin && <CreateClassForm onCreated={fetchClasses} />}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: '#78909C' }}>
            שיעורים קרובים
          </h2>

          {(loading || !authChecked) ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-lg">🌿</p>
              <p className="mt-2 text-sm" style={{ color: '#78909C' }}>אין שיעורים מתוכננים כרגע.</p>
              {isAdmin && <p className="mt-1 text-xs" style={{ color: '#78909C' }}>לחץ &quot;New Class&quot; להוספת שיעור.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map(cls => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                  isRegistered={userRegs.has(cls.id)}
                  onCancel={handleCancel}
                  onRegistered={() => { fetchClasses(); fetchUserRegs() }}
                  userProfile={userProfile}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default function Home() {
  if (!isSupabaseConfigured()) return <SetupBanner />
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
