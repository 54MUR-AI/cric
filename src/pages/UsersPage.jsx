import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'
import { Trash2, Mail, Plus, X } from 'lucide-react'
import Button from '../components/ui/Button'

const OFFICER_TITLES = ['Chair', 'Vice Chair', 'Treasurer', 'Secretary', 'Trustee']

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingReset, setSendingReset] = useState(null)
  const [showAddOfficer, setShowAddOfficer] = useState(false)
  const [newOfficer, setNewOfficer] = useState({ profile_id: '', title: OFFICER_TITLES[0] })

  async function fetchAll() {
    const [uRes, oRes] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('officers').select('*, profile:profile_id(display_name)').order('sort_order'),
    ])
    setUsers(uRes.data || [])
    setOfficers(oRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function sendReset(email) {
    if (!email) { toast.error('No email on file for this user'); return }
    setSendingReset(email)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://54mur-ai.github.io/cric/update-password',
    })
    setSendingReset(null)
    if (error) { toast.error(error.message); return }
    toast.success('Password reset email sent')
  }

  async function removeOfficer(id) {
    if (!confirm('Remove this officer?')) return
    const { error } = await supabase.from('officers').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.info('Officer removed')
    fetchAll()
  }

  async function addOfficer() {
    if (!newOfficer.profile_id) return
    const { error } = await supabase.from('officers').insert({
      profile_id: newOfficer.profile_id,
      title: newOfficer.title,
      sort_order: officers.length,
    })
    if (error) { toast.error(error.message); return }
    toast.success(`${newOfficer.title} assigned`)
    setShowAddOfficer(false)
    setNewOfficer({ profile_id: '', title: OFFICER_TITLES[0] })
    fetchAll()
  }

  if (!isAdmin) return <div className="text-stone-500 dark:text-stone-400">Access denied.</div>
  if (loading) return <div className="text-stone-500 dark:text-stone-400">Loading...</div>

  const assignedIds = new Set(officers.map(o => o.profile_id))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Manage Users</h1>

      <div className="rounded-lg bg-white dark:bg-stone-900 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300">Officers</h2>
          <Button size="sm" onClick={() => setShowAddOfficer(true)}>
            <Plus className="h-3 w-3 mr-1" /> Assign Officer
          </Button>
        </div>
        {officers.length === 0 && <p className="text-sm text-stone-400 dark:text-stone-500">No officers assigned</p>}
        <div className="space-y-1.5">
          {officers.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-stone-50 dark:hover:bg-stone-800">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-stone-800 dark:text-stone-200">{o.profile?.display_name || 'Unknown'}</span>
                <span className="text-stone-400 dark:text-stone-500">—</span>
                <span className="text-stone-600 dark:text-stone-400">{o.title}</span>
              </div>
              <button onClick={() => removeOfficer(o.id)} className="p-1 rounded text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showAddOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddOfficer(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800 dark:text-stone-200">Assign Officer</h3>
              <button onClick={() => setShowAddOfficer(false)}><X className="h-4 w-4 text-stone-400 dark:text-stone-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Member</label>
                <select value={newOfficer.profile_id} onChange={e => setNewOfficer({ ...newOfficer, profile_id: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm">
                  <option value="">Select a member...</option>
                  {users.filter(u => !assignedIds.has(u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.display_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Title</label>
                <select value={newOfficer.title} onChange={e => setNewOfficer({ ...newOfficer, title: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm">
                  {OFFICER_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" size="sm" onClick={() => setShowAddOfficer(false)}>Cancel</Button>
              <Button size="sm" onClick={addOfficer} disabled={!newOfficer.profile_id}>Assign</Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white dark:bg-stone-900 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
            {users.map((u) => {
              const officer = officers.find(o => o.profile_id === u.id)
              return (
                <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                  <td className="px-4 py-3">
                    <span className="text-stone-800 dark:text-stone-200">{u.display_name}</span>
                    {officer && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2 py-0.5">{officer.title}</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400 text-xs">{u.email || <span className="italic text-stone-300 dark:text-stone-600">No email</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => sendReset(u.email)} disabled={sendingReset === u.email || !u.email}>
                        <Mail className="h-3 w-3 mr-1" />{sendingReset === u.email ? 'Sending...' : 'Reset'}
                      </Button>
                      {!officer && !u.is_admin && (
                        <button onClick={() => { if (confirm('Remove this user?')) { supabase.from('profiles').delete().eq('id', u.id).then(() => fetchAll()) }}} className="p-1.5 rounded text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
