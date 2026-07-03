import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('password')
  const [sent, setSent] = useState(false)
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

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md text-center">
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Check your email</h1>
          <p className="text-stone-600">A magic link has been sent to <strong>{email}</strong></p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">CRIC Island Manager</h1>
        <p className="text-sm text-stone-500 mb-6">Sign in to continue</p>

        <div className="flex mb-6 rounded-md bg-stone-100 p-1">
          <button onClick={() => setMode('password')} className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'password' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Password</button>
          <button onClick={() => setMode('magic')} className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'magic' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Magic Link</button>
        </div>

        <form onSubmit={mode === 'password' ? handlePassword : handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" placeholder="you@example.com" />
          </div>
          {mode === 'password' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600" placeholder="Your password" />
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
