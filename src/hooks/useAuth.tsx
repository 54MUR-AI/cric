import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  display_name?: string
  email?: string
  is_admin?: boolean
  created_at?: string
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  role: string
  isAdmin: boolean
  loading: boolean
  signIn: (email: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<{ user: User | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => { if (!cancelled) setLoading(false) }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      clearTimeout(timeout)
      if (session?.user) {
        setUser(session.user)
        setRole(session.user.app_metadata?.role || 'member')
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }).catch(() => { if (!cancelled) { clearTimeout(timeout); setLoading(false) } })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setRole(session.user.app_metadata?.role || 'member')
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setRole('member')
        setLoading(false)
      }
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setProfile(data)
      } else {
        // Profile doesn't exist yet (trigger race), create it
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId })
          .select('*')
          .single()
        if (insertError) throw insertError
        setProfile(newProfile)
      }
    } catch (err) {
      console.warn('Failed to fetch/create profile', err)
    }
    setLoading(false)
  }

  async function signIn(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }

  async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isAdmin = role === 'super_admin'

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, loading, signIn, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
