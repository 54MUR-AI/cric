import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Trash2, ShieldCheck, Shield } from 'lucide-react'
import Button from '../components/ui/Button'

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('display_name')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleRole(userId, currentRole) {
    setError('')
    const newRole = currentRole === 'super_admin' ? 'member' : 'super_admin'
    const { error: err } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (err) { setError(err.message); return }
    fetchUsers()
  }

  async function deleteUser(userId) {
    if (!confirm('Remove this user? They will no longer be able to sign in.')) return
    setError('')
    const { error: err } = await supabase.from('profiles').delete().eq('id', userId)
    if (err) { setError(err.message); return }
    fetchUsers()
  }

  if (!isAdmin) return <div className="text-stone-500">Access denied.</div>
  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-800">Manage Users</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="rounded-lg bg-white shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-800">{u.display_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.role === 'super_admin' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {u.role === 'super_admin' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {u.role === 'super_admin' ? 'Super Admin' : 'Member'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => toggleRole(u.id, u.role)} className="text-xs px-2 py-1 h-auto">
                      {u.role === 'super_admin' ? 'Demote' : 'Promote'}
                    </Button>
                    {u.role !== 'super_admin' && (
                      <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
