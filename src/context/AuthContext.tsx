import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { fetchProfile } from '../services/api'
import { appUrl } from '../lib/share'
import type { Profile } from '../types/domain'

export const ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    username: string
    displayName: string
  }) => Promise<{ needsConfirm: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(userId)
    if (p?.blocked_at) {
      await supabase.auth.signOut()
      setProfile(null)
      return
    }
    setProfile(p)
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        return loadProfile(data.session?.user.id)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void loadProfile(next?.user.id)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: Boolean(profile?.is_admin) && !profile?.blocked_at,
      loading,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const p = data.user ? await fetchProfile(data.user.id) : null
        if (p?.blocked_at) {
          await supabase.auth.signOut()
          setProfile(null)
          throw new Error(ACCOUNT_BLOCKED)
        }
        setProfile(p)
      },
      signUp: async ({ email, password, username, displayName }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.toLowerCase(), display_name: displayName },
            emailRedirectTo: appUrl('login'),
          },
        })
        if (error) throw error
        return { needsConfirm: !data.session }
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: appUrl('reset-password'),
        })
        if (error) throw error
      },
      refreshProfile: async () => {
        await loadProfile(session?.user.id)
      },
    }),
    [session, profile, loading, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
