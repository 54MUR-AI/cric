import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

interface CabinRef {
  name: string
}

interface MapPin {
  id: string
  label: string
  type: string
  latitude: number
  longitude: number
  description?: string
  cabin_id?: string
  created_by?: string
  created_at?: string
  cabin?: CabinRef
}

interface PinInput {
  label: string
  type: string
  latitude: number
  longitude: number
  description?: string
  cabin_id?: string
}

export function useMapPins() {
  const [pins, setPins] = useState<MapPin[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const fetchPins = useCallback(async () => {
    try {
      const cached = await db.map_pins.orderBy('label').toArray()
      if (cached.length) setPins(cached)
      const { data, error } = await supabase
        .from('map_pins')
        .select('*')
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

  const addPin = useCallback(async (input: PinInput) => {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...input, created_by: user?.id }
    const { data, error } = await supabase
      .from('map_pins')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    setPins(prev => [...prev, data].sort((a, b) => a.label.localeCompare(b.label)))
    db.map_pins.put(data)
    toast.success('Pin added')
    return data
  }, [toast])

  const updatePin = useCallback(async (id: string, updates: Partial<MapPin>) => {
    const originalPin = pins.find(p => p.id === id)
    if (!originalPin) return
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const { data, error } = await supabase.from('map_pins').update(updates).eq('id', id).select('*').single()
    if (error) {
      setPins(prev => prev.map(p => p.id === id ? originalPin : p))
      console.error('Pin update error:', error)
      toast.error('Failed to update pin')
      return
    }
    setPins(prev => prev.map(p => p.id === id ? data : p))
    db.map_pins.put(data)
    toast.success('Pin updated')
    return data
  }, [pins, toast])

  const deletePin = useCallback(async (id: string) => {
    const deletedPin = pins.find(p => p.id === id)
    if (!deletedPin) return
    setPins(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('map_pins').delete().eq('id', id)
    if (error) {
      setPins(prev => [...prev, deletedPin].sort((a, b) => a.label.localeCompare(b.label)))
      toast.error('Failed to delete pin')
      return
    }
    db.map_pins.delete(id)
    toast.info('Pin deleted')
  }, [pins, toast])

  return { pins, loading, addPin, updatePin, deletePin, refresh: fetchPins }
}
