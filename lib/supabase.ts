import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Types
export interface Class {
  id: string
  title: string
  instructor: string
  start_time: string
  duration_minutes: number
  max_capacity: number
  min_threshold: number
  created_at: string
  registration_count?: number
}

export interface Registration {
  id: string
  class_id: string
  full_name: string
  phone: string
  registered_at: string
  status: string
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Lazy browser client — only created when env vars are present
let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}
