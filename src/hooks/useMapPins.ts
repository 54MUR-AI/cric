import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineWrite'
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
    } catch (err) {
      console.warn('Failed to fetch map pins:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPins() }, [fetchPins])

  const addPin = useCallback(async (input: PinInput) => {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...input, created_by: user?.id }
    const { data, queued } = await offlineInsert('map_pins', payload)
    if (data) {
      setPins(prev => [...prev, data].sort((a, b) => a.label.localeCompare(b.label)))
      db.map_pins.put(data)
      toast.info(queued ? 'Pin queued — will sync when online' : 'Pin added')
    }
    return data
  }, [toast])

  const updatePin = useCallback(async (id: string, updates: Partial<MapPin>) => {
    const originalPin = pins.find(p => p.id === id)
    if (!originalPin) return
    setPins(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const { data, queued } = await offlineUpdate('map_pins', id, updates)
    if (queued) {
      db.map_pins.put({ ...originalPin, ...updates })
      toast.info('Pin update queued — will sync when online')
    } else if (data) {
      setPins(prev => prev.map(p => p.id === id ? data : p))
      db.map_pins.put(data)
      toast.success('Pin updated')
    } else {
      setPins(prev => prev.map(p => p.id === id ? originalPin : p))
    }
    return data
  }, [pins, toast])

  const deletePin = useCallback(async (id: string) => {
    const deletedPin = pins.find(p => p.id === id)
    if (!deletedPin) return
    setPins(prev => prev.filter(p => p.id !== id))
    const { queued } = await offlineDelete('map_pins', id)
    if (queued) {
      db.map_pins.delete(id)
      toast.info('Pin deletion queued — will sync when online')
    } else {
      db.map_pins.delete(id)
      toast.info('Pin deleted')
    }
  }, [pins, toast])

  return { pins, loading, addPin, updatePin, deletePin, refresh: fetchPins }
}
