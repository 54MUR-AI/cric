import { useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, differenceInCalendarDays } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { Share2, Plus } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { useBookings } from '../hooks/useBookings'
import { useCabins } from '../hooks/useCabins'
import { useAuth } from '../hooks/useAuth'
import { useShare } from '../lib/share'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

export default function SchedulePage() {
  const { bookings, loading: loadingB, createBooking, updateBooking, deleteBooking } = useBookings()
  const { cabins, loading: loadingC } = useCabins()
  const { user, isAdmin } = useAuth()
  const { copy } = useShare()
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [formData, setFormData] = useState({ cabin_id: '', guests: '', notes: '' })
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(null)

  const events = bookings.map((b) => ({
    id: b.id,
    title: `${b.cabins?.name}${b.guests ? ` — ${b.guests}` : ''}`,
    start: new Date(b.start_date),
    end: new Date(new Date(b.end_date).setHours(23, 59)),
    resource: b,
    allDay: true,
  }))

  function handleSelectSlot({ start, end }) {
    setSelectedSlot({ start, end: new Date(new Date(end).getTime() - 86400000) })
    setFormData({ cabin_id: cabins[0]?.id || '', guests: '', notes: '', end_date: '' })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const start = selectedSlot.start.toISOString().split('T')[0]
    const end = formData.end_date || selectedSlot.end.toISOString().split('T')[0]
    if (end < start) {
      setError('End date must be on or after the start date')
      return
    }
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

  function handleSelectEvent(event) {
    setSelectedEvent(event.resource)
  }

  async function handleDelete(id) {
    if (confirmCancel) await deleteBooking(id)
    setConfirmCancel(null)
  }

  if (loadingB || loadingC) return <div className="text-stone-500 dark:text-stone-400">Loading...</div>

  const eventHeightStyle = `.rbc-month-view .rbc-event { min-height: 14px; padding: 0 2px; font-size: 0.6rem; line-height: 1.2; border-radius: 2px; border-width: 1px; } .rbc-month-view .rbc-event-content { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .rbc-month-view .rbc-row-segment { padding: 0; } .rbc-month-view .rbc-row-content { max-height: none; min-height: 0; } .rbc-month-view .rbc-date-cell { padding: 0; text-align: center; font-size: 0.65rem; } .rbc-month-view .rbc-row-bg { min-height: 0; } .rbc-month-view .rbc-show-more { font-size: 0.55rem; line-height: 1; } .rbc-month-view .rbc-header { padding: 2px 0; font-size: 0.65rem; } .rbc-month-view .rbc-row { min-height: 0; } .rbc-month-row { min-height: 0; }`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Schedule</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {cabins.filter((c) => c.is_active).map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </div>
        ))}
      </div>

      <style>{eventHeightStyle}</style>
      <button
        onClick={() => {
          const today = new Date()
          setSelectedSlot({ start: today, end: today })
          setFormData({ cabin_id: cabins[0]?.id || '', guests: '', notes: '', end_date: '' })
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
          views={[Views.MONTH, Views.WEEK]}
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
          style={{ height: 600 }}
        />
      </div>

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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">From</label>
                  <input type="date" value={selectedSlot.start.toISOString().split('T')[0]} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm bg-stone-50 dark:bg-stone-950" disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">To</label>
                  <input type="date" value={formData.end_date || selectedSlot.end.toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full rounded-md border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm" />
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
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Book</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setSelectedEvent(null); setEditing(false) }}>
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30" onClick={(e) => e.stopPropagation()}>
            {!editing ? (
              <>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">{selectedEvent.cabins?.name}</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
                  {formatDate(selectedEvent.start_date)} – {formatDate(selectedEvent.end_date)}
                  {selectedEvent.guests && <> · {selectedEvent.guests}</>}
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
