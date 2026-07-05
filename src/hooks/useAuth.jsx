import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
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

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch {}
    setLoading(false)
  }

  async function signIn(email) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }

  async function signInWithPassword(email, password) {
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
