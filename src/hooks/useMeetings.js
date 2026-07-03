import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

export function useMeetings() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  async function fetchMeetings() {
    const cached = await db.meetings.orderBy('date').reverse().toArray()
    if (cached.length) setMeetings(cached)
    const { data } = await supabase.from('meetings').select('*, profiles:created_by(display_name)').order('date', { ascending: false })
    if (data) { setMeetings(data); db.meetings.bulkPut(data) }
    setLoading(false)
  }

  useEffect(() => { fetchMeetings() }, [])

  async function createMeeting(meeting) {
    const { data, error } = await supabase.from('meetings').insert(meeting).select().single()
    if (error) throw error
    if (data) { setMeetings((prev) => [data, ...prev]); db.meetings.put(data); toast.success('Meeting created') }
    return data
  }

  async function updateMeeting(id, updates) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
    const { data, error } = await supabase.from('meetings').update(updates).eq('id', id).select().single()
    if (error) { fetchMeetings(); throw error }
    if (data) { setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m))); db.meetings.put({ ...meetings.find(m => m.id === id), ...data }); toast.success('Meeting updated') }
    return data
  }

  async function deleteMeeting(id) {
    const prev = meetings
    setMeetings((prev) => prev.filter((m) => m.id !== id))
    try { await supabase.from('meetings').delete().eq('id', id); db.meetings.delete(id); toast.info('Meeting deleted') }
    catch { setMeetings(prev); toast.error('Failed to delete meeting') }
  }

  async function getMeetingWithItems(id) {
    const cachedItems = await db.meeting_agenda_items.where('meeting_id').equals(id).sortBy('sort_order')
    const { data: meeting } = await supabase.from('meetings').select('*, profiles:created_by(display_name)').eq('id', id).single()
    if (!meeting) return null
    const { data: items } = await supabase.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('sort_order')
    const agendaItems = items || cachedItems
    if (items) db.meeting_agenda_items.bulkPut(items)
    return { ...meeting, agenda_items: agendaItems }
  }

  return { meetings, loading, createMeeting, updateMeeting, deleteMeeting, getMeetingWithItems, refetch: fetchMeetings }
}
