import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineWrite'
import { useToast } from '../components/ui/Toast'

interface ProfileRef {
  display_name: string
}

interface Meeting {
  id: string
  date: string
  title?: string
  created_by?: string
  notes?: string
  created_at?: string
  profiles?: ProfileRef
}

interface AgendaItem {
  id: string
  meeting_id: string
  title: string
  sort_order: number
  notes?: string
  completed?: boolean
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  async function fetchMeetings() {
    const cached = await db.meetings.orderBy('date').reverse().toArray()
    if (cached.length) setMeetings(cached)
    const { data } = await supabase.from('meetings').select('*').order('date', { ascending: false })
    if (data) { setMeetings(data); db.meetings.bulkPut(data) }
    setLoading(false)
  }

  useEffect(() => { fetchMeetings() }, [])

  async function createMeeting(meeting: Partial<Meeting>) {
    const { data, queued } = await offlineInsert('meetings', meeting)
    if (data) {
      setMeetings((prev) => [data, ...prev]); db.meetings.put(data)
      toast.info(queued ? 'Meeting queued — will sync when online' : 'Meeting created')
    }
    return data
  }

  async function updateMeeting(id: string, updates: Partial<Meeting>) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
    const { data, queued } = await offlineUpdate('meetings', id, updates)
    if (queued) {
      db.meetings.put({ ...meetings.find(m => m.id === id), ...updates })
      toast.info('Meeting update queued — will sync when online')
    } else if (data) {
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m))); db.meetings.put({ ...meetings.find(m => m.id === id), ...data }); toast.success('Meeting updated')
    } else { fetchMeetings(); throw new Error('Update failed') }
    return data
  }

  async function deleteMeeting(id: string) {
    const current = meetings
    setMeetings((prev) => prev.filter((m) => m.id !== id))
    try {
      const { queued } = await offlineDelete('meetings', id)
      db.meetings.delete(id)
      toast.info(queued ? 'Meeting deletion queued — will sync when online' : 'Meeting deleted')
    } catch { setMeetings(current); toast.error('Failed to delete meeting') }
  }

  async function getMeetingWithItems(id: string): Promise<(Meeting & { agenda_items: AgendaItem[] }) | null> {
    const cachedItems = await db.meeting_agenda_items.where('meeting_id').equals(id).sortBy('sort_order')
    const { data: meeting } = await supabase.from('meetings').select('*').eq('id', id).single()
    if (!meeting) return null
    const { data: items } = await supabase.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('sort_order')
    const agendaItems = items || cachedItems
    if (items) db.meeting_agenda_items.bulkPut(items)
    return { ...meeting, agenda_items: agendaItems }
  }

  return { meetings, loading, createMeeting, updateMeeting, deleteMeeting, getMeetingWithItems, refetch: fetchMeetings }
}
