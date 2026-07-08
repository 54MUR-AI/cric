import { useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { useEffect } from 'react'
import { Share2, Plus, Ship, Clock, MapPin, Users, DollarSign } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { useShare } from '../lib/share'
import { useBookings } from '../hooks/useBookings'
import { useCabins } from '../hooks/useCabins'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useEscapeKey } from '../components/ui/useEscapeKey'
import { TripModal } from './BoatSchedulePage'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

function toLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SchedulePage() {
  const { bookings, loading: loadingB, error: errorB, createBooking, updateBooking, deleteBooking, refetch } = useBookings()
  const { cabins, loading: loadingC, error: errorC } = useCabins()
  const { user, isAdmin } = useAuth()
  const { copy } = useShare()
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [formData, setFormData] = useState({ cabin_id: '', guests: '', notes: '', start_date: '', end_date: '', rooms: [] })
  const BAT_MANOR_ROOMS = ["Master", "Guest", "Anna's", "Sarah's", "Bobby's", "Walter's"]
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [conflicts, setConflicts] = useState(null)

  useEscapeKey(() => setShowForm(false), showForm)
  useEscapeKey(() => { setSelectedEvent(null); setEditing(false) }, !!selectedEvent)

  function detectConflicts(cabinId, startDate, endDate, rooms = []) {
    const cabinBookings = bookings.filter(b => b.cabin_id === cabinId)
    const conflicts = []

    for (const b of cabinBookings) {
      const bStart = b.start_date
      const bEnd = b.end_date
      // Check date overlap
      if (startDate <= bEnd && endDate >= bStart) {
        // If cabin has rooms, check room-level conflicts
        if (rooms.length > 0 && b.room) {
          if (rooms.includes(b.room)) {
            conflicts.push({ ...b, conflictType: 'room' })
          }
        } else if (!b.room) {
          // Whole-cabin conflict
          conflicts.push({ ...b, conflictType: 'cabin' })
        }
      }
    }
    return conflicts
  }
  const [trips, setTrips] = useState([])
  const [showTripModal, setShowTripModal] = useState(false)
  const [editTrip, setEditTrip] = useState(null)

  const events = bookings.map((b) => {
    const s = toLocalDate(b.start_date)
    const e = toLocalDate(b.end_date)
    e.setHours(23, 59)
    const title = b.room
      ? `${b.cabins?.name} — ${b.room}${b.guests ? ` (${b.guests})` : ''}`
      : `${b.cabins?.name}${b.guests ? ` — ${b.guests}` : ''}`
    return {
      id: b.id,
      title,
      start: s,
      end: e,
      resource: b,
      allDay: true,
    }
  })

  function handleSelectSlot({ start, end }) {
    const endDay = new Date(new Date(end).getTime() - 86400000)
    setSelectedSlot({ start, end: endDay })
    setFormData({ cabin_id: cabins[0]?.id || '', guests: '', notes: '', start_date: fmtInput(start), end_date: fmtInput(endDay), rooms: [] })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const start = formData.start_date
    const end = formData.end_date
    if (end < start) {
      setError('End date must be on or after the start date')
      return
    }

    // Client-side conflict detection (skip if user already confirmed)
    if (!conflicts) {
      const found = detectConflicts(formData.cabin_id, start, end, formData.rooms)
      if (found.length > 0) {
        const cabin = cabins.find(c => c.id === formData.cabin_id)
        const conflictNames = found.map(b => {
          const who = b.guests || 'Someone'
          const room = b.room ? ` (${b.room})` : ''
          return `${who}${room}: ${b.start_date} to ${b.end_date}`
        }).join('\n')
        setConflicts({ cabin: cabin?.name, conflicts: found, message: conflictNames })
        return
      }
    }

    setConflicts(null)
    const selectedCabin = cabins.find(c => c.id === formData.cabin_id)
    if (selectedCabin?.has_rooms) {
      if (formData.rooms.length === 0) {
        setError('Select at least one room')
        return
      }
      try {
        const rows = formData.rooms.map(room => ({
          cabin_id: formData.cabin_id,
          user_id: user.id,
          start_date: start,
          end_date: end,
          room,
          guests: formData.guests || null,
          notes: formData.notes || null,
        }))
        const { error } = await supabase.from('bookings').insert(rows).select()
        if (error) throw error
        refetch()
        setShowForm(false)
      } catch (err) {
        setError(err.message.includes('conflict') ? 'One or more rooms are already booked for those dates' : err.message)
      }
    } else {
      try {
        await createBooking({
          cabin_id: formData.cabin_id,
          user_id: user.id,
          start_date: start,
          end_date: end,
          guests: formData.guests || null,
          notes: formData.notes || null,
        })
        setShowForm(false)
      } catch (err) {
        setError(err.message.includes('conflict') ? 'This cabin is already booked for those dates' : err.message)
      }
    }
  }

  function handleSelectEvent(event) {
    setSelectedEvent(event.resource)
  }

  async function handleDelete(id) {
    if (confirmCancel) await deleteBooking(id)
    setConfirmCancel(null)
  }

  async function fetchTrips() {
    const { data } = await supabase.from('boat_trips').select('*, profiles:created_by(display_name)').order('trip_date').order('departure_time')
    setTrips(data || [])
  }

  useEffect(() => { fetchTrips() }, [])

  if (loadingB || loadingC) return <div className="text-stone-500 dark:text-stone-400">Loading...</div>

  const syncError = errorB || errorC

  const augBookings = bookings.filter(b => b.start_date?.startsWith('2026-08'))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Schedule</h1>
        <span className="text-[10px] text-stone-400 dark:text-stone-600 font-mono">B:{bookings.length} Aug:{augBookings.length}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {cabins.filter((c) => c.is_active).map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </div>
        ))}
      </div>

      {syncError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Sync error: {syncError}
          <button onClick={refetch} className="ml-2 underline hover:no-underline">Retry</button>
        </div>
      )}

      <button
        onClick={() => {
          const today = new Date()
          const ds = fmtInput(today)
          setSelectedSlot({ start: today, end: today })
          setFormData({ cabin_id: cabins[0]?.id || '', guests: '', notes: '', start_date: ds, end_date: ds, rooms: [] })
          setError('')
          setShowForm(true)
        }}
        className="md:hidden fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-colors active:scale-95"
        aria-label="New booking"
      >
        <Plus className="h-6 w-6" />
      </button>

      <div className="rounded-lg bg-white dark:bg-stone-900 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={[Views.MONTH]}
          selectable="ignoreEvents"
          popup
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.resource.cabins?.color || '#3b82f6',
              borderColor: event.resource.cabins?.color || '#3b82f6',
              borderRadius: '4px',
              fontSize: '0.8rem',
            },
          })}
          style={{ height: 'calc(100vh - 300px)', minHeight: 400, maxHeight: 800 }}
        />
      </div>

      {/* Dr Fun Boat Schedule */}
      <div className="rounded-lg bg-white dark:bg-stone-900 shadow-sm dark:shadow-black/20 border border-cyan-200 dark:border-cyan-900/30">
        <div className="flex items-center justify-between p-4 border-b border-cyan-200 dark:border-cyan-900/30">
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="font-semibold text-stone-800 dark:text-stone-200">Dr Fun Pontoon Schedule</h2>
          </div>
          <Button size="sm" onClick={() => { setEditTrip(null); setShowTripModal(true) }}><Plus className="h-3 w-3 mr-1" />New Trip</Button>
        </div>
        <div className="p-4 border-b border-cyan-200 dark:border-cyan-900/30 text-xs text-stone-500 dark:text-stone-400 space-y-1">
          <p>Ferry to/from the Foot (Cranberry Lake, NY). ~45 min one-way. <strong className="text-stone-700 dark:text-stone-300">$25 gas fee</strong> — leave cash in log book box in Main House. Only <strong className="text-stone-700 dark:text-stone-300">93 octane</strong>.</p>
          <p>Only one trip at a time — check schedule to avoid conflicts.</p>
        </div>
        <div className="p-4">
          {trips.filter(t => t.trip_date >= (formData.start_date || new Date().toISOString().slice(0, 10))).length === 0 ? (
            <div className="text-center py-6 text-stone-400 dark:text-stone-500 text-sm">No upcoming trips scheduled</div>
          ) : (
            <div className="space-y-1.5">
              {trips.filter(t => t.trip_date >= (formData.start_date || new Date().toISOString().slice(0, 10))).slice(0, 10).map(trip => (
                <button key={trip.id} onClick={() => { setEditTrip(trip); setShowTripModal(true) }} className="w-full text-left flex items-center justify-between rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 px-3 py-2 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-stone-800 dark:text-stone-200">{new Date(trip.trip_date + 'T' + trip.departure_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {trip.departure_time?.slice(0, 5)}{trip.return_time ? `-${trip.return_time.slice(0, 5)}` : ''}</span>
                    <span className="flex items-center gap-1 text-stone-400"><MapPin className="h-3 w-3" />{trip.destination}</span>
                    <span className="flex items-center gap-1 text-stone-400"><Users className="h-3 w-3" />{trip.passengers}</span>
                    {trip.profiles?.display_name && <span className="text-stone-400">{trip.profiles.display_name}</span>}
                    {trip.gas_fee_paid && <span className="flex items-center gap-1 text-emerald-600"><DollarSign className="h-3 w-3" />Paid</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTripModal && (
        <TripModal
          trip={editTrip}
          onClose={() => { setShowTripModal(false); setEditTrip(null) }}
          onSave={() => { setShowTripModal(false); setEditTrip(null); fetchTrips() }}
          onDelete={() => { setShowTripModal(false); setEditTrip(null); fetchTrips() }}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-4">New Booking</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Cabin</label>
                <select
                  value={formData.cabin_id}
                  onChange={(e) => setFormData({ ...formData, cabin_id: e.target.value })}
                  className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm"
                  required
                >
                  {cabins.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {cabins.find(c => c.id === formData.cabin_id)?.has_rooms && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Rooms</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BAT_MANOR_ROOMS.map(room => (
                      <label key={room} className="flex items-center gap-2 rounded-md border border-stone-200 dark:border-stone-700 px-3 py-2 text-sm cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:has-[:checked]:bg-emerald-900/20 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.rooms.includes(room)}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              rooms: e.target.checked
                                ? [...prev.rooms, room]
                                : prev.rooms.filter(r => r !== room)
                            }))
                          }}
                          className="accent-emerald-600"
                        />
                        {room}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">From</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">To</label>
                  <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Guests</label>
                <input
                  type="text"
                  value={formData.guests}
                  onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                  className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm"
                  placeholder="e.g. Debbie &amp; Dick"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              {conflicts && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Booking conflict detected</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 whitespace-pre-line">{conflicts.message}</p>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setConflicts(null)}>Choose different dates</Button>
                    <Button type="submit" size="sm">Book anyway</Button>
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              {!conflicts && (
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit">Book</Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setSelectedEvent(null); setEditing(false) }}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30" onClick={(e) => e.stopPropagation()}>
            {!editing ? (
              <>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">{selectedEvent.cabins?.name}{selectedEvent.room ? ` — ${selectedEvent.room}` : ''}</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
                  {formatDate(selectedEvent.start_date)} – {formatDate(selectedEvent.end_date)}
                  {selectedEvent.guests && <> · {selectedEvent.guests}</>}
                  {selectedEvent.room && <> · {selectedEvent.room}</>}
                </p>
                {selectedEvent.notes && <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">{selectedEvent.notes}</p>}
                <div className="flex gap-2 justify-between items-center">
                  <button onClick={() => copy(`${selectedEvent.cabins?.name}: ${formatDate(selectedEvent.start_date)} – ${formatDate(selectedEvent.end_date)}${selectedEvent.guests ? ` — ${selectedEvent.guests}` : ''}`, 'Booking copied')} className="inline-flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors">
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                  <div className="flex gap-2">
                    {(selectedEvent.user_id === user?.id || isAdmin) && (
                      <Button variant="secondary" onClick={() => { setEditData({ end_date: selectedEvent.end_date, guests: selectedEvent.guests || '', notes: selectedEvent.notes || '' }); setEditing(true) }}>Edit</Button>
                    )}
                    <Button variant="secondary" onClick={() => { setSelectedEvent(null); setEditing(false) }}>Close</Button>
                    <Button variant="danger" onClick={() => setConfirmCancel(selectedEvent.id)}>Cancel Booking</Button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={async (e) => { e.preventDefault(); try { await updateBooking(selectedEvent.id, editData); setEditing(false); setSelectedEvent(null) } catch {} }} className="space-y-4">
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">Edit Booking</h2>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">To</label>
                  <input type="date" value={editData.end_date} onChange={(e) => setEditData({ ...editData, end_date: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Guests</label>
                  <input type="text" value={editData.guests} onChange={(e) => setEditData({ ...editData, guests: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Notes (optional)</label>
                  <textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" rows={2} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmCancel}
        title="Cancel booking?"
        message="This will permanently remove this reservation."
        confirmLabel="Cancel Booking"
        variant="danger"
        onConfirm={() => handleDelete(confirmCancel)}
        onCancel={() => setConfirmCancel(null)}
      />
    </div>
  )
}
