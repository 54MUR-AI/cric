import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true)
      else setError('No reset token found. Use the link from your email.')
    })
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
