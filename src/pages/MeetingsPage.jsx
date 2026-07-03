import { useState } from 'react'
import { useMeetings } from '../hooks/useMeetings'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import { formatDate } from '../lib/utils'
import { Plus, ChevronUp, ChevronDown } from 'lucide-react'

export default function MeetingsPage() {
  const { meetings, loading, createMeeting, updateMeeting, deleteMeeting } = useMeetings()
  const { user, isAdmin } = useAuth()
  const [selectedMeetingId, setSelectedMeetingId] = useState(null)
  const [meetingDetail, setMeetingDetail] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', date: '', location: '' })
  const [agendaItems, setAgendaItems] = useState([{ title: '', description: '', proposer: '', seconder: '' }])

  async function openMeeting(id) {
    setSelectedMeetingId(id)
    const { data: meeting } = await supabase.from('meetings').select('*, profiles:created_by(display_name)').eq('id', id).single()
    if (!meeting) return
    const { data: items } = await supabase.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('sort_order')
    setMeetingDetail({ ...meeting, agenda_items: items || [] })
  }

  function addAgendaItem() {
    setAgendaItems([...agendaItems, { title: '', description: '', proposer: '', seconder: '' }])
  }

  function updateAgendaItem(idx, field, value) {
    const updated = [...agendaItems]
    updated[idx][field] = value
    setAgendaItems(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const meeting = await createMeeting({ ...formData, created_by: user.id })
    if (!meeting) return
    const items = agendaItems.filter((a) => a.title.trim())
    for (let i = 0; i < items.length; i++) {
      await supabase.from('meeting_agenda_items').insert({ ...items[i], meeting_id: meeting.id, sort_order: i })
    }
    setShowForm(false)
  }

  const outcomeColors = { passed: 'text-green-700 bg-green-50', failed: 'text-red-700 bg-red-50', tabled: 'text-amber-700 bg-amber-50' }

  if (loading) return <div className="text-stone-500">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Meetings</h1>
        <Button onClick={() => { setFormData({ title: '', date: '', location: '' }); setAgendaItems([{ title: '', description: '', proposer: '', seconder: '' }]); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Meeting
        </Button>
      </div>

      <div className="space-y-2">
        {meetings.map((m) => (
          <div key={m.id} className={`rounded-lg bg-white p-4 shadow-sm border cursor-pointer transition-colors ${selectedMeetingId === m.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-stone-200 hover:border-emerald-300'}`} onClick={() => openMeeting(m.id)}>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium text-stone-800">{m.title}</span>
                <span className="text-xs text-stone-400 ml-2">{formatDate(m.date)}</span>
              </div>
              {m.location && <span className="text-xs text-stone-400">{m.location}</span>}
            </div>
          </div>
        ))}
        {meetings.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No meetings recorded yet</p>}
      </div>

      {meetingDetail && (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-stone-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-stone-800">{meetingDetail.title}</h2>
              <p className="text-sm text-stone-400">{formatDate(meetingDetail.date)}{meetingDetail.location ? ` · ${meetingDetail.location}` : ''}</p>
            </div>
            <div className="flex gap-2">
              {isAdmin && <Button variant="danger" onClick={() => { if (confirm('Delete this meeting permanently?')) { deleteMeeting(meetingDetail.id); setMeetingDetail(null); setSelectedMeetingId(null) } }}>Delete</Button>}
              <Button variant="ghost" onClick={() => setSelectedMeetingId(null)}>Close</Button>
            </div>
          </div>

          <div className="space-y-3">
            {meetingDetail.agenda_items.map((item, idx) => (
              <div key={item.id} className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-xs text-stone-400 font-mono mt-0.5 shrink-0">{idx + 1}.</span>
                    <h3 className="font-medium text-stone-800">{item.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {meetingDetail.agenda_items.length > 1 && (
                      <>
                        <button
                          onClick={async () => {
                            const items = [...meetingDetail.agenda_items]
                            if (idx === 0) return
                            ;[items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]
                            const updated = items.map((it, i) => ({ ...it, sort_order: i }))
                            setMeetingDetail({ ...meetingDetail, agenda_items: updated })
                            for (const it of updated) {
                              await supabase.from('meeting_agenda_items').update({ sort_order: it.sort_order }).eq('id', it.id)
                            }
                          }}
                          className="text-stone-300 hover:text-stone-600 transition-colors" aria-label="Move up"
                        ><ChevronUp className="h-4 w-4" /></button>
                        <button
                          onClick={async () => {
                            const items = [...meetingDetail.agenda_items]
                            if (idx === items.length - 1) return
                            ;[items[idx], items[idx + 1]] = [items[idx + 1], items[idx]]
                            const updated = items.map((it, i) => ({ ...it, sort_order: i }))
                            setMeetingDetail({ ...meetingDetail, agenda_items: updated })
                            for (const it of updated) {
                              await supabase.from('meeting_agenda_items').update({ sort_order: it.sort_order }).eq('id', it.id)
                            }
                          }}
                          className="text-stone-300 hover:text-stone-600 transition-colors" aria-label="Move down"
                        ><ChevronDown className="h-4 w-4" /></button>
                      </>
                    )}
                    {item.outcome && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${outcomeColors[item.outcome]}`}>{item.outcome}</span>
                    )}
                  </div>
                </div>
                {item.description && <p className="text-sm text-stone-600 mt-1">{item.description}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                  {item.proposer && <span>Proposed by: {item.proposer}</span>}
                  {item.seconder && <span>Seconded by: {item.seconder}</span>}
                </div>
                {(item.vote_yes > 0 || item.vote_no > 0 || item.vote_abstain > 0) && (
                  <div className="flex gap-3 mt-2 text-xs font-medium">
                    <span className="text-green-700">{item.vote_yes} yes</span>
                    <span className="text-red-700">{item.vote_no} no</span>
                    <span className="text-stone-400">{item.vote_abstain} abstain</span>
                  </div>
                )}
              </div>
            ))}
            {meetingDetail.agenda_items.length === 0 && <p className="text-sm text-stone-400">No agenda items</p>}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">New Meeting</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" placeholder="2026 Annual Meeting" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-stone-700">Agenda Items</label>
                  <button type="button" onClick={addAgendaItem} className="text-xs text-emerald-700 hover:underline">+ Add item</button>
                </div>
                <div className="space-y-3">
                  {agendaItems.map((item, idx) => (
                    <div key={idx} className="rounded border border-stone-200 p-3 space-y-2">
                      <input type="text" value={item.title} onChange={(e) => updateAgendaItem(idx, 'title', e.target.value)} placeholder="Item title" className="w-full rounded border border-stone-200 px-2 py-1 text-sm" />
                      <textarea value={item.description} onChange={(e) => updateAgendaItem(idx, 'description', e.target.value)} placeholder="Description (optional)" className="w-full rounded border border-stone-200 px-2 py-1 text-sm" rows={1} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={item.proposer} onChange={(e) => updateAgendaItem(idx, 'proposer', e.target.value)} placeholder="Proposer" className="rounded border border-stone-200 px-2 py-1 text-sm" />
                        <input type="text" value={item.seconder} onChange={(e) => updateAgendaItem(idx, 'seconder', e.target.value)} placeholder="Seconder" className="rounded border border-stone-200 px-2 py-1 text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Create Meeting</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
