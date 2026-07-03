import { useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { Share2 } from 'lucide-react'
import { useBookings } from '../hooks/useBookings'
import { useCabins } from '../hooks/useCabins'
import { useAuth } from '../hooks/useAuth'
import { useShare } from '../lib/share'
import Button from '../components/ui/Button'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

export default function SchedulePage() {
  const { bookings, loading: loadingB, createBooking, deleteBooking } = useBookings()
  const { cabins, loading: loadingC } = useCabins()
  const { user, isAdmin } = useAuth()
  const { copy } = useShare()
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [formData, setFormData] = useState({ cabin_id: '', notes: '' })
  const [error, setError] = useState('')

  const events = bookings.map((b) => ({
    id: b.id,
    title: `${b.cabins?.name} - ${b.profiles?.display_name || 'Unknown'}`,
    start: new Date(b.start_date),
    end: new Date(new Date(b.end_date).setHours(23, 59)),
    resource: b,
    allDay: true,
  }))

  function handleSelectSlot({ start, end }) {
    setSelectedSlot({ start, end: new Date(new Date(end).getTime() - 86400000) })
    setFormData({ cabin_id: cabins[0]?.id || '', notes: '' })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await createBooking({
        cabin_id: formData.cabin_id,
        user_id: user.id,
        start_date: selectedSlot.start.toISOString().split('T')[0],
        end_date: selectedSlot.end.toISOString().split('T')[0],
        notes: formData.notes || null,
      })
      setShowForm(false)
    } catch (err) {
      setError(err.message.includes('conflict') ? 'This cabin is already booked for those dates' : err.message)
    }
  }

  function handleSelectEvent(event) {
    setSelectedEvent(event.resource)
  }

  async function handleDelete(id) {
    if (confirm('Cancel this booking?')) await deleteBooking(id)
  }

  if (loadingB || loadingC) return <div className="text-stone-500">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Schedule</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {cabins.filter((c) => c.is_active).map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-sm text-stone-600">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-stone-200 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK]}
          selectable
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
          style={{ height: 600 }}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">New Booking</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Cabin</label>
                <select
                  value={formData.cabin_id}
                  onChange={(e) => setFormData({ ...formData, cabin_id: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  required
                >
                  {cabins.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">From</label>
                  <input type="date" value={selectedSlot.start.toISOString().split('T')[0]} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm bg-stone-50" disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">To</label>
                  <input type="date" value={selectedSlot.end.toISOString().split('T')[0]} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm bg-stone-50" disabled />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Book</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-800 mb-1">{selectedEvent.cabins?.name}</h2>
            <p className="text-sm text-stone-500 mb-4">
              {formatDate(selectedEvent.start_date)} – {formatDate(selectedEvent.end_date)}
              {selectedEvent.profiles?.display_name && <> · Booked by {selectedEvent.profiles.display_name}</>}
            </p>
            {selectedEvent.notes && <p className="text-sm text-stone-600 mb-4">{selectedEvent.notes}</p>}
            <div className="flex gap-2 justify-between items-center">
              <button onClick={() => copy(`${selectedEvent.cabins?.name}: ${formatDate(selectedEvent.start_date)} – ${formatDate(selectedEvent.end_date)}${selectedEvent.notes ? ` — ${selectedEvent.notes}` : ''}`, 'Booking copied')} className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors">
                <Share2 className="h-3 w-3" /> Share
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button>
                <Button variant="danger" onClick={() => { handleDelete(selectedEvent.id); setSelectedEvent(null) }}>Cancel Booking</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
