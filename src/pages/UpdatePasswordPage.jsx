import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import Button from '../components/ui/Button'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const readyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let authSub

    const check = () => {
      if (cancelled || readyRef.current) return
      readyRef.current = true
      setReady(true)
      setError('')
    }

    async function recoverFromURL() {
      const hash = window.location.hash
      const search = window.location.search

      // Case 1: implicit flow — tokens in URL hash
      // #access_token=xxx&refresh_token=yyy&type=recovery&expires_in=3600
      if (hash && hash.includes('type=recovery')) {
        const h = new URLSearchParams(hash.replace(/^#/, ''))
        const accessToken = h.get('access_token')
        const refreshToken = h.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error: err } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!err) return check()
        }
      }

      // Case 2: PKCE flow — code in URL query params
      // ?code=xxx
      if (search) {
        const q = new URLSearchParams(search)
        const code = q.get('code')
        if (code) {
          // First try with the default PKCE client (works when the
          // same browser triggered the reset)
          const { error: err1 } = await supabase.auth.exchangeCodeForSession(code)
          if (!err1) return check()

          // If that failed (likely missing PKCE verifier when an admin
          // triggered the reset for another user), try with an implicit-
          // flow client so the code exchange request is sent without a
          // code_verifier. The server may accept it depending on config.
          const implicitClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { flowType: 'implicit' },
          })
          const { error: err2 } = await implicitClient.auth.exchangeCodeForSession(code)
          if (!err2) return check()
        }
      }
    }

    // Try the fast path first — session already established
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data?.session) return check()
      recoverFromURL()
    })

    // Fallback: listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) check()
      }
    })
    authSub = subscription

    const timeout = setTimeout(() => {
      if (!cancelled && !readyRef.current) {
        setError('No reset token found. Use the link from your email.')
      }
    }, 15000)

    return () => { cancelled = true; authSub?.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
    setTimeout(() => navigate('/'), 2000)
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center bg-white/90 dark:bg-stone-900/90 rounded-lg shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700 p-8 max-w-sm w-full">
        <div className="text-3xl mb-3">✅</div>
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-1">Password Updated</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">Redirecting to dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-stone-900/90 rounded-lg shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700 p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-1">Set New Password</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Enter your new password below.</p>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">New Password</label>
            <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Confirm Password</label>
            <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !ready}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
