import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useEscapeKey } from '../components/ui/useEscapeKey'
import { Pencil, Plus, History, MapPin, Trash2, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCabins } from '../hooks/useCabins'
import { useMapPins } from '../hooks/useMapPins'
import { useProfiles } from '../hooks/useProfiles'
import { CRANBERRY_LAKE } from '../lib/map/constants'
import { haversineKm, bearing } from '../lib/map/utils'

const CABIN_DESCRIPTIONS = {
  'Bat Manor': 'Named for its resident bat population. Rustic cabin with characteristic log construction.',
  'Loon Lodge': 'Lakeside lodge with loft. Popular for its water views and proximity to the dock.',
  'Toad Hall': 'Cozy cabin with modern updates including metal roof and new septic system.',
  'The Bunkhouse': 'Simple bunkhouse with recent window and door replacements. Ideal for overflow guests.',
}

function formatDistance(lat, lon) {
  const dist = haversineKm(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], lat, lon)
  const dir = bearing(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], lat, lon)
  return `${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} ${dir} of landing`
}

export default function CabinsPage() {
  const { isAdmin } = useAuth()
  const { cabins, loading, createCabin, updateCabin, addImprovement, deleteImprovement } = useCabins()
  const { pins } = useMapPins()
  const { profiles } = useProfiles()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3b82f6' })
  const [expandedCabin, setExpandedCabin] = useState(null)
  const [improvementForm, setImprovementForm] = useState({ year: new Date().getFullYear(), description: '' })
  const [improvementError, setImprovementError] = useState('')

  useEscapeKey(() => setShowForm(false), showForm)

  const pinsByCabin = {}
  for (const p of pins) {
    if (p.cabin_id) {
      pinsByCabin[p.cabin_id] = p
    }
  }

  const profileById = {}
  for (const p of profiles) profileById[p.id] = p.display_name || p.email || 'Unknown'

  async function handleSubmit(e) {
    e.preventDefault()
    const cabin = { name: formData.name.trim(), description: formData.description.trim() || null, color: formData.color }
    if (editing) await updateCabin(editing, cabin)
    else await createCabin(cabin)
    setShowForm(false)
    setEditing(null)
    setFormData({ name: '', description: '', color: '#3b82f6' })
  }

  function editCabin(cabin) {
    setFormData({ name: cabin.name, description: cabin.description || '', color: cabin.color })
    setEditing(cabin.id)
    setShowForm(true)
  }

  async function handleAddImprovement(cabinId) {
    const year = Number(improvementForm.year)
    const description = improvementForm.description.trim()
    if (!Number.isInteger(year) || year < 1900 || year > 2100) { setImprovementError('Enter a valid year'); return }
    if (!description) { setImprovementError('Description is required'); return }
    setImprovementError('')
    try {
      await addImprovement(cabinId, year, description)
      setImprovementForm({ year: new Date().getFullYear(), description: '' })
    } catch { setImprovementError('Failed to add improvement') }
  }

  if (loading) return <div className="text-stone-500 dark:text-stone-400">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Cabins</h1>
        {isAdmin && (
          <Button onClick={() => { setFormData({ name: '', description: '', color: '#3b82f6' }); setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Add Cabin
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cabins.map((cabin) => {
          const cabinName = cabin.name
          const blurb = cabin.description || CABIN_DESCRIPTIONS[cabinName]
          const pin = pinsByCabin[cabin.id]
          const improvements = cabin.improvements || []
          const isExpanded = expandedCabin === cabin.id

          return (
            <div key={cabin.id} className={`rounded-lg bg-white dark:bg-stone-900 shadow-sm dark:shadow-black/20 border ${cabin.is_active ? 'border-stone-200 dark:border-stone-700' : 'border-stone-200 dark:border-stone-700 opacity-60'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-block h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cabin.color }} />
                    <div>
                      <h3 className="font-medium text-stone-800 dark:text-stone-200 truncate">{cabinName}</h3>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{blurb}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editCabin(cabin)} className="p-1.5 rounded text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => updateCabin(cabin.id, { is_active: !cabin.is_active })} className="p-1.5 rounded text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium">{cabin.is_active ? 'Disable' : 'Enable'}</button>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-stone-500 dark:text-stone-400 shrink-0">Booking authority</label>
                    <select
                      value={cabin.booking_authority_id || ''}
                      onChange={(e) => updateCabin(cabin.id, { booking_authority_id: e.target.value || null })}
                      className="flex-1 min-w-0 rounded border border-stone-300 dark:border-stone-600 px-2 py-1 text-xs bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200"
                    >
                      <option value="">None</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name || p.email || 'Unknown'}</option>)}
                    </select>
                  </div>
                )}
                {!isAdmin && cabin.booking_authority_id && (
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Bookings confirmed by <span className="font-medium text-stone-600 dark:text-stone-300">{profileById[cabin.booking_authority_id] || 'the authority'}</span>
                  </p>
                )}

                {pin && (
                  <div className="mt-3 flex gap-3 items-start rounded-md border border-stone-100 dark:border-stone-800 p-2">
                    {pin.image_url
                      ? <img src={pin.image_url} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
                      : <span className="w-16 h-16 rounded flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 shrink-0"><MapPin className="h-6 w-6" /></span>}
                    <div className="text-xs text-stone-500 dark:text-stone-400 space-y-0.5 min-w-0">
                      <div className="text-stone-600 dark:text-stone-300 font-medium">{pin.label}</div>
                      {pin.description && <div className="truncate">{pin.description}</div>}
                      <div>{formatDistance(pin.latitude, pin.longitude)}</div>
                      <Link to="/map" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"><MapPin className="h-3 w-3" /> View on map</Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 dark:border-stone-800">
                <button onClick={() => setExpandedCabin(isExpanded ? null : cabin.id)} className="flex items-center gap-1.5 w-full px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  <History className="h-3.5 w-3.5" />
                  Improvement History ({improvements.length})
                  <span className="ml-auto">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-1">
                    {improvements.length === 0 && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 py-1">No improvements recorded yet.</p>
                    )}
                    {improvements.map((imp) => (
                      <div key={imp.id} className="flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400 py-1">
                        <span className="font-medium text-stone-400 dark:text-stone-500 w-8 shrink-0">{imp.year}</span>
                        <span className="flex-1">{imp.description}</span>
                        {isAdmin && (
                          <button onClick={() => deleteImprovement(imp.id, cabin.id)} className="text-stone-400 dark:text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    ))}
                    {isAdmin && (
                      <div className="flex gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <input type="number" value={improvementForm.year} min="1900" max="2100" onChange={(e) => setImprovementForm(f => ({ ...f, year: e.target.value }))} className="w-20 rounded border border-stone-300 dark:border-stone-600 px-2 py-1 text-xs bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200" aria-label="Year" />
                        <input type="text" placeholder="Description" value={improvementForm.description} onChange={(e) => setImprovementForm(f => ({ ...f, description: e.target.value }))} className="flex-1 rounded border border-stone-300 dark:border-stone-600 px-2 py-1 text-xs bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200" aria-label="Improvement description" />
                        <button onClick={() => handleAddImprovement(cabin.id)} className="rounded px-2 py-1 text-xs text-white dark:text-stone-800 bg-stone-800 dark:bg-stone-200 hover:bg-stone-700 dark:hover:bg-stone-300 shrink-0">Add</button>
                      </div>
                    )}
                    {improvementError && <p className="text-xs text-rose-600 dark:text-rose-400">{improvementError}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">{editing ? 'Edit Cabin' : 'Add Cabin'}</h2>
              <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Color</label>
                <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-9 w-full rounded-md border border-stone-300 dark:border-stone-600 cursor-pointer" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">{editing ? 'Save' : 'Add'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
