import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await signIn(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
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
        <p className="text-sm text-stone-500 mb-6">Sign in with your email</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  )
}
