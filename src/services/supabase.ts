import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  )
}

let listShareToken: string | null = null

export function setListShareToken(token: string | null): void {
  const next = token?.trim() ?? ''
  listShareToken = next || null
}

export function getListShareToken(): string | null {
  return listShareToken
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      )
      if (listShareToken) headers.set('x-list-share-token', listShareToken)
      return fetch(input, { ...init, headers })
    },
  },
})
