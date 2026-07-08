import { useState, useEffect } from 'react'
import { Ship, Plus, X, ChevronLeft, ChevronRight, DollarSign, Users, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'

const TRIP_DURATION = 45

function TripModal({ trip, onClose, onSave, onDelete }) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(trip || { trip_date: '', departure_time: '', return_time: '', destination: 'The Foot (Cranberry Lake)', passengers: 1, notes: '', gas_fee_paid: false })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, created_by: user.id }
      if (trip) {
        const { error } = await supabase.from('boat_trips').update(payload).eq('id', trip.id)
        if (error) throw error
        toast.success('Trip updated')
      } else {
        const { error } = await supabase.from('boat_trips').insert(payload)
        if (error) throw error
        toast.success('Trip added')
      }
      onSave()
    } catch (e) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    const { error } = await supabase.from('boat_trips').delete().eq('id', trip.id)
    if (error) toast.error(error.message)
    else { toast.success('Trip deleted'); onDelete() }
    setConfirmDelete(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-stone-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200">{trip ? 'Edit Trip' : 'New Boat Trip'}</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Date</label>
            <input type="date" value={form.trip_date} onChange={e => setForm({ ...form, trip_date: e.target.value })} required className="w-full rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Departure</label>
              <input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} required className="w-full rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Est. Return (optional)</label>
              <input type="time" value={form.return_time} onChange={e => setForm({ ...form, return_time: e.target.value })} className="w-full rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Destination</label>
            <input type="text" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="w-full rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Passengers</label>
            <input type="number" min="1" value={form.passengers} onChange={e => setForm({ ...form, passengers: parseInt(e.target.value) || 1 })} className="w-full rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Notes (bags, equipment, etc.)</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-stone-800 dark:text-stone-200" />
          </div>
          {trip && (
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <input type="checkbox" checked={form.gas_fee_paid} onChange={e => setForm({ ...form, gas_fee_paid: e.target.checked })} className="rounded border-stone-300 dark:border-stone-500" />
              Gas fee paid ($25)
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : trip ? 'Update' : 'Add Trip'}</Button>
            {trip && <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>}
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete trip?"
        message="This will remove this boat trip from the schedule."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

export { TripModal }
export default function BoatSchedulePage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editTrip, setEditTrip] = useState(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    const [tripsRes, profilesRes] = await Promise.all([
      supabase.from('boat_trips').select('*').order('trip_date').order('departure_time'),
      supabase.from('profiles').select('id, display_name'),
    ])
    const profMap = new Map((profilesRes.data ?? []).map(p => [p.id, { display_name: p.display_name }]))
    const merged = (tripsRes.data ?? []).map(t => ({ ...t, profiles: profMap.get(t.created_by) ?? null }))
    setTrips(merged)
  }

  const upcoming = trips.filter(t => t.trip_date >= today)
  const past = trips.filter(t => t.trip_date < today)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Dr Fun Schedule</h1>
        </div>
        <Button onClick={() => { setEditTrip(null); setShowModal(true) }}><Plus className="h-4 w-4 mr-1" />New Trip</Button>
      </div>

      <div className="rounded-lg border border-cyan-200 dark:border-cyan-900/30 bg-cyan-50 dark:bg-cyan-900/20 p-4 text-sm text-stone-700 dark:text-stone-300">
        <p><strong>Dr Fun</strong> — the pontoon boat used to ferry people and their bags to/from the Foot (Cranberry Lake, NY). One-way is ~45 minutes.</p>
        <p className="mt-1"><strong>Gas fee:</strong> $25/round trip. Leave cash in the log book box on the desk in Main House. Only use <strong>93 octane</strong> fuel.</p>
        <p className="mt-1"><strong>Important:</strong> Only one trip at a time — check the schedule to avoid conflicts.</p>
      </div>

      <div>
        <h2 className="font-semibold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600" />
          Upcoming Trips ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState icon="ship" title="No trips scheduled yet" description="Click 'New Trip' to add a pontoon run." />
        ) : (
          <div className="space-y-2">
            {upcoming.map(trip => (
              <button
                key={trip.id}
                onClick={() => { setEditTrip(trip); setShowModal(true) }}
                className="w-full text-left rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-800 dark:text-stone-200">
                      {new Date(trip.trip_date + 'T' + trip.departure_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}
                      {trip.departure_time.slice(0, 5)}
                      {trip.return_time && ` — ${trip.return_time.slice(0, 5)}`}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.destination}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{trip.passengers} {trip.passengers === 1 ? 'person' : 'people'}</span>
                      <span className="flex items-center gap-1">{trip.profiles?.display_name}</span>
                      {trip.gas_fee_paid && <span className="flex items-center gap-1 text-emerald-600"><DollarSign className="h-3 w-3" />Paid</span>}
                    </div>
                    {trip.notes && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{trip.notes}</p>}
                  </div>
                  <span className="text-[10px] text-stone-400">~{TRIP_DURATION}min</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-500 dark:text-stone-400 font-medium">Past Trips ({past.length})</summary>
          <div className="mt-2 space-y-1">
            {past.map(trip => (
              <div key={trip.id} className="flex items-center justify-between rounded px-3 py-2 text-xs text-stone-400 dark:text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer"
                onClick={() => { setEditTrip(trip); setShowModal(true) }}
              >
                <span>{new Date(trip.trip_date + 'T' + trip.departure_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {trip.departure_time.slice(0, 5)}</span>
                <span>{trip.destination}</span>
                <span>{trip.passengers}p</span>
                <span>{trip.profiles?.display_name}</span>
                {trip.gas_fee_paid && <span className="text-emerald-600">Paid</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {showModal && (
        <TripModal
          trip={editTrip}
          onClose={() => { setShowModal(false); setEditTrip(null) }}
          onSave={() => { setShowModal(false); setEditTrip(null); fetchTrips() }}
          onDelete={() => { setShowModal(false); setEditTrip(null); fetchTrips() }}
        />
      )}
    </div>
  )
}
