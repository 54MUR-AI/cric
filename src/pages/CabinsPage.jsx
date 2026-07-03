import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import { Pencil, Plus, History } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const IMPROVEMENTS = {
  'Main House': [
    { year: 2024, desc: 'Foundation work started (trenches dug, 6-ft concrete beams poured)' },
    { year: 2022, desc: 'Engineering study by North Woods Engineering (~$2,300)' },
    { year: 2020, desc: 'Log pest treatment (powder post beetles)' },
    { year: 2018, desc: 'New fridge' },
    { year: 2017, desc: 'New water heater' },
  ],
  'Toad Hall': [
    { year: 2023, desc: 'New septic + 3 propane tanks with relief valves' },
    { year: 2022, desc: 'Metal roof installed' },
    { year: 2021, desc: 'New deck' },
  ],
  'Loon Lodge': [
    { year: 2023, desc: 'Trim repaint + deck wash' },
    { year: 2022, desc: 'Full stain + ramp boards + tree removal' },
    { year: 2021, desc: 'Loft electrified' },
  ],
  'Bunkhouse': [
    { year: 2024, desc: 'New front windows, sliding door, metal L-piece, siding/deck repair' },
  ],
}

const CABIN_DESCRIPTIONS = {
  'Main House': 'Main camp with kitchen, common areas, and sleeping quarters. Original structure with log construction.',
  'Bat Manor': 'Named for its resident bat population. Rustic cabin with characteristic log construction.',
  'Loon Lodge': 'Lakeside lodge with loft. Popular for its water views and proximity to the dock.',
  'Toad Hall': 'Cozy cabin with modern updates including metal roof and new septic system.',
  'Bunkhouse': 'Simple bunkhouse with recent window and door replacements. Ideal for overflow guests.',
}

export default function CabinsPage() {
  const { isAdmin } = useAuth()
  const [cabins, setCabins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3b82f6' })
  const [expandedCabin, setExpandedCabin] = useState(null)

  async function fetchCabins() {
    const { data } = await supabase.from('cabins').select('*').order('sort_order').order('name')
    setCabins(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCabins() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      await supabase.from('cabins').update(formData).eq('id', editing)
    } else {
      await supabase.from('cabins').insert(formData)
    }
    setShowForm(false)
    setEditing(null)
    fetchCabins()
  }

  function editCabin(cabin) {
    setFormData({ name: cabin.name, description: cabin.description || '', color: cabin.color })
    setEditing(cabin.id)
    setShowForm(true)
  }

  async function toggleActive(cabin) {
    await supabase.from('cabins').update({ is_active: !cabin.is_active }).eq('id', cabin.id)
    fetchCabins()
  }

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Cabins</h1>
        {isAdmin && (
          <Button onClick={() => { setFormData({ name: '', description: '', color: '#3b82f6' }); setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Add Cabin
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cabins.map((cabin) => {
          const cabinName = cabin.name
          const improvements = IMPROVEMENTS[cabinName]
          const blurb = CABIN_DESCRIPTIONS[cabinName]
          const isExpanded = expandedCabin === cabin.id

          return (
            <div key={cabin.id} className={`rounded-lg bg-white shadow-sm border ${cabin.is_active ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-block h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cabin.color }} />
                    <div>
                      <h3 className="font-medium text-stone-800 truncate">{cabinName}</h3>
                      <p className="text-xs text-stone-400">{blurb || cabin.description}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editCabin(cabin)} className="p-1.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => toggleActive(cabin)} className="p-1.5 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 text-xs font-medium">{cabin.is_active ? 'Disable' : 'Enable'}</button>
                    </div>
                  )}
                </div>
              </div>

              {improvements && improvements.length > 0 && (
                <div className="border-t border-stone-100">
                  <button onClick={() => setExpandedCabin(isExpanded ? null : cabin.id)} className="flex items-center gap-1.5 w-full px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors">
                    <History className="h-3.5 w-3.5" />
                    Improvement History ({improvements.length})
                    <span className="ml-auto">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1">
                      {improvements.map((imp, i) => (
                        <div key={i} className="flex gap-3 text-xs text-stone-600 py-1">
                          <span className="font-medium text-stone-400 w-8 shrink-0">{imp.year}</span>
                          <span>{imp.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">{editing ? 'Edit Cabin' : 'Add Cabin'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Color</label>
                <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-9 w-full rounded-md border border-stone-300 cursor-pointer" />
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
