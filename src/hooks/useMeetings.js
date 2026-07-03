import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMeetings() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchMeetings() {
    const { data } = await supabase.from('meetings').select('*, profiles:created_by(display_name)').order('date', { ascending: false })
    setMeetings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMeetings() }, [])

  async function createMeeting(meeting) {
    const { data, error } = await supabase.from('meetings').insert(meeting).select().single()
    if (error) throw error
    if (data) setMeetings((prev) => [data, ...prev])
    return data
  }

  async function updateMeeting(id, updates) {
    const { data, error } = await supabase.from('meetings').update(updates).eq('id', id).select().single()
    if (error) throw error
    if (data) setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))
    return data
  }

  async function deleteMeeting(id) {
    const { error } = await supabase.from('meetings').delete().eq('id', id)
    if (error) throw error
    setMeetings((prev) => prev.filter((m) => m.id !== id))
  }

  async function getMeetingWithItems(id) {
    const { data: meeting } = await supabase.from('meetings').select('*, profiles:created_by(display_name)').eq('id', id).single()
    if (!meeting) return null
    const { data: items } = await supabase.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('sort_order')
    return { ...meeting, agenda_items: items || [] }
  }

  return { meetings, loading, createMeeting, updateMeeting, deleteMeeting, getMeetingWithItems, refetch: fetchMeetings }
}
