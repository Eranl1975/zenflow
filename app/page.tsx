'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabaseClient, isSupabaseConfigured, Class } from '@/lib/supabase'
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
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get('admin') === ADMIN_SECRET
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  // Map of class_id → registration_id for the current user
  const [userRegs, setUserRegs] = useState<Map<string, string>>(new Map())

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

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      <header style={{ backgroundColor: '#E0F2F1' }} className="border-b border-teal-100">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#455A64' }}>ZenFlow 🌿</h1>
              <p className="text-sm" style={{ color: '#78909C' }}>Pilates Studio Schedule</p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Admin</span>
                <a
                  href="/api/export"
                  className="rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  Export CSV
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {isAdmin && <CreateClassForm onCreated={fetchClasses} />}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: '#78909C' }}>
            שיעורים קרובים
          </h2>

          {loading ? (
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-teal-600">Loading…</div>}>
      <DashboardContent />
    </Suspense>
  )
}
