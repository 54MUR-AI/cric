import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('password')
  const [sent, setSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithPassword } = useAuth()

  async function handleMagicLink(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePassword(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(err.message.includes('Invalid login') ? 'Invalid email or password' : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://chairrock.app/update-password',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm rounded-lg bg-white/90 p-8 shadow-md dark:bg-stone-900/90 dark:shadow-stone-900/30 text-center">
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">Check your email</h1>
          <p className="text-stone-600 dark:text-stone-400">A magic link has been sent to <strong>{email}</strong></p>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm rounded-lg bg-white/90 p-8 shadow-md dark:bg-stone-900/90 dark:shadow-stone-900/30 text-center">
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">Check your email</h1>
          <p className="text-stone-600 dark:text-stone-400">A password reset link has been sent to <strong>{email}</strong></p>
          <button onClick={() => { setShowForgot(false); setResetSent(false) }} className="mt-4 text-sm text-emerald-700 hover:underline">Back to sign in</button>
        </div>
      </div>
    )
  }

  if (showForgot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm rounded-lg bg-white/90 p-8 shadow-md dark:bg-stone-900/90 dark:shadow-stone-900/30">
          <h1 className="text-xl font-bold text-stone-800 dark:text-stone-200 mb-1">Reset Password</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Enter your email and we'll send you a reset link.</p>
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
              <input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" placeholder="you@example.com" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors disabled:opacity-50">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300">Back to sign in</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg bg-white/90 p-8 shadow-md dark:bg-stone-900/90 dark:shadow-stone-900/30">
        <img src={`${import.meta.env.BASE_URL}icons/icon-512x512.png`} alt="CRIC" className="mx-auto h-64 w-64 mb-3" />
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-1">CRIC Manager</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Sign in to continue</p>

        <div className="flex mb-6 rounded-md bg-stone-100 dark:bg-stone-800 p-1">
          <button onClick={() => setMode('password')} className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'password' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 shadow-sm dark:shadow-stone-900/30' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}>Password</button>
          <button onClick={() => setMode('magic')} className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'magic' ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 shadow-sm dark:shadow-stone-900/30' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}>Magic Link</button>
        </div>

        <form onSubmit={mode === 'password' ? handlePassword : handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" placeholder="you@example.com" />
          </div>
          {mode === 'password' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" placeholder="Your password" />
              <div className="text-right mt-1">
                <button type="button" onClick={() => { setShowForgot(true); setError('') }} className="text-xs text-emerald-700 hover:underline">Forgot password?</button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : mode === 'password' ? 'Sign in' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  )
}
