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
        <p className="mt-4 text-xs" style={{ color: '#78909C' }}>
          Then restart the dev server: <code className="rounded bg-gray-100 px-1">npm run dev</code>
        </p>
      </div>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get('admin') === ADMIN_SECRET
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClasses = useCallback(async () => {
    const res = await fetch('/api/classes')
    if (res.ok) {
      const data = await res.json()
      setClasses(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClasses()

    // Real-time subscription — only if Supabase is configured
    const client = getSupabaseClient()
    if (!client) return

    const channel = client
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchClasses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetchClasses)
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [fetchClasses])

  async function handleDelete(id: string) {
    if (!confirm('Delete this class? All registrations will be removed.')) return
    await fetch(`/api/classes?id=${id}`, { method: 'DELETE' })
    fetchClasses()
  }

  const upcoming = classes.filter(c => new Date(c.start_time) >= new Date())
  const past = classes.filter(c => new Date(c.start_time) < new Date())

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#E0F2F1' }} className="border-b border-teal-100">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#455A64' }}>ZenFlow 🌿</h1>
              <p className="text-sm" style={{ color: '#78909C' }}>Pilates Studio Schedule</p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
                  Admin
                </span>
                <a
                  href="/api/export"
                  className="rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  Export TSV
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Admin create form */}
        {isAdmin && <CreateClassForm onCreated={fetchClasses} />}

        {/* Upcoming classes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: '#78909C' }}>
            Upcoming Classes
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-lg">🌿</p>
              <p className="mt-2 text-sm" style={{ color: '#78909C' }}>No upcoming classes scheduled.</p>
              {isAdmin && <p className="mt-1 text-xs" style={{ color: '#78909C' }}>Click &quot;New Class&quot; to add one.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(cls => (
                <ClassCard key={cls.id} cls={cls} isAdmin={isAdmin} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        {/* Past classes */}
        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: '#78909C' }}>
              Past Classes
            </h2>
            <div className="space-y-3 opacity-60">
              {past.slice(-3).map(cls => (
                <ClassCard key={cls.id} cls={cls} isAdmin={isAdmin} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default function Home() {
  if (!isSupabaseConfigured()) {
    return <SetupBanner />
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-teal-600">Loading…</div>}>
      <DashboardContent />
    </Suspense>
  )
}
