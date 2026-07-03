import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMapPins() {
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPins = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('map_pins')
        .select('*, cabin:cabins(name)')
        .order('label')
      if (error) throw error
      setPins(data || [])
    } catch {
      setPins([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPins()
  }, [fetchPins])

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
    return data
  }, [])

  const deletePin = useCallback(async (id) => {
    const { error } = await supabase
      .from('map_pins')
      .delete()
      .eq('id', id)
    if (error) throw error
    setPins(prev => prev.filter(p => p.id !== id))
  }, [])

  return { pins, loading, addPin, deletePin, refresh: fetchPins }
}