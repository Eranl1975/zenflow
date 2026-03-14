'use client'

import { useState } from 'react'
import { Class } from '@/lib/supabase'
import RegistrationModal from './RegistrationModal'

interface ClassCardProps {
  cls: Class
  isAdmin: boolean
  isRegistered: boolean
  onDelete: (id: string) => void
  onCancel: (classId: string) => void
  onRegistered: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isLowAttendance(cls: Class): boolean {
  const count = cls.registration_count ?? 0
  const hoursUntil = (new Date(cls.start_time).getTime() - Date.now()) / 36e5
  return count < cls.min_threshold && hoursUntil <= 12 && hoursUntil > 0
}

export default function ClassCard({ cls, isAdmin, isRegistered, onDelete, onCancel, onRegistered }: ClassCardProps) {
  const [showModal, setShowModal] = useState(false)
  const count = cls.registration_count ?? 0
  const isFull = count >= cls.max_capacity
  const low = isLowAttendance(cls)
  const isPast = new Date(cls.start_time) < new Date()

  return (
    <>
      <div className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
        isRegistered ? 'border-teal-200 bg-teal-50/40' :
        low ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white'
      }`}>

        {/* Badges */}
        <div className="flex gap-2 mb-3 flex-wrap min-h-[0]">
          {isRegistered && (
            <span className="flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
              ✓ נרשמת
            </span>
          )}
          {low && !isRegistered && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              ⚠ Low Attendance
            </span>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-700">{cls.title}</h3>
            <p className="text-sm text-slate-500">{cls.instructor}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-teal-600">{formatTime(cls.start_time)}</p>
            <p className="text-xs text-slate-400">{cls.duration_minutes} min</p>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-500">{formatDate(cls.start_time)}</p>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>{count} / {cls.max_capacity} spots</span>
            {isFull && <span className="font-semibold text-rose-500">Class Full</span>}
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? 'bg-rose-400' : count >= cls.min_threshold ? 'bg-teal-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min((count / cls.max_capacity) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        {!isPast && (
          <div className="mt-4 flex gap-2">
            {isRegistered ? (
              <button
                onClick={() => onCancel(cls.id)}
                className="flex-1 rounded-xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                ביטול הרשמה
              </button>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                disabled={isFull}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  isFull
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : 'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700'
                }`}
              >
                {isFull ? 'Class Full' : 'Join Class'}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onDelete(cls.id)}
                className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {isPast && (
          <div className="mt-4">
            <span className="block w-full rounded-xl bg-gray-50 py-2.5 text-center text-sm text-gray-400">
              Class Ended
            </span>
          </div>
        )}
      </div>

      {showModal && (
        <RegistrationModal
          cls={cls}
          onClose={() => setShowModal(false)}
          onRegistered={() => { setShowModal(false); onRegistered() }}
        />
      )}
    </>
  )
}
