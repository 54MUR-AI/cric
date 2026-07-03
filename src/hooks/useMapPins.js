import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

export function useMapPins() {
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const fetchPins = useCallback(async () => {
    try {
      const cached = await db.map_pins.orderBy('label').toArray()
      if (cached.length) setPins(cached)
      const { data, error } = await supabase
        .from('map_pins')
        .select('*, cabin:cabins(name)')
        .order('label')
      if (error) throw error
      if (data) { setPins(data); db.map_pins.bulkPut(data) }
    } catch {
      setPins([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPins() }, [fetchPins])

  const addPin = useCallback(async ({ label, type, latitude, longitude, description, cabin_id }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { label, type, latitude, longitude, description, created_by: user?.id }
    if (cabin_id) payload.cabin_id = cabin_id
    const { data, error } = await supabase
      .from('map_pins')
      .insert(payload)
      .select('*, cabin:cabins(name)')
      .single()
    if (error) throw error
    setPins(prev => [...prev, data].sort((a, b) => a.label.localeCompare(b.label)))
    db.map_pins.put(data)
    toast.success('Pin added')
    return data
  }, [toast])

  const deletePin = useCallback(async (id) => {
    const prev = pins
    setPins(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('map_pins').delete().eq('id', id)
    if (error) { setPins(prev); toast.error('Failed to delete pin'); return }
    db.map_pins.delete(id)
    toast.info('Pin deleted')
  }, [pins, toast])

  return { pins, loading, addPin, deletePin, refresh: fetchPins }
}
