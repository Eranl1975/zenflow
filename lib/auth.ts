'use client'

import { getSupabaseClient, type UserProfile } from './supabase'

export type { UserProfile }

/** Returns the current Supabase session, or null if not logged in. */
export async function getSession() {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Returns the authenticated User object, or null. */
export async function getCurrentUser() {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Fetches the user_profiles row for the given userId via the anon client. */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as UserProfile
}

/**
 * Signs in with email + password.
 * Returns the Supabase AuthResponse (data.session, data.user, error).
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  return await supabase.auth.signInWithPassword({ email, password })
}

/**
 * Creates a new account via the server-side signup API (handles email
 * confirmation bypass and profile creation), then signs in to get a session.
 */
export async function signUp(
  email: string,
  phone: string,
  password: string,
  displayName?: string
): Promise<{ data: unknown; error: { message: string } | null }> {
  // Step 1: server-side user + profile creation
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, password, display_name: displayName?.trim() || null }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { data: null, error: { message: body.error || 'ההרשמה נכשלה. נסה שוב.' } }
  }

  // Step 2: sign in to obtain session
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { data: null, error: { message: error.message } }
  return { data, error: null }
}

/** Signs the current user out and clears localStorage phone/name keys. */
export async function doSignOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zenflow_phone')
    localStorage.removeItem('zenflow_name')
  }
  const supabase = getSupabaseClient()
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Calls the backfill API to link historical registrations (matched by phone)
 * to the currently authenticated user's account.
 */
export async function backfillRegistrations(accessToken: string) {
  await fetch('/api/auth/backfill', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
