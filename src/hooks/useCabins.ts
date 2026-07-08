import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

interface Cabin {
  id: string
  name: string
  color?: string
  description?: string
  sort_order?: number
  rooms?: string[]
  max_occupancy?: number
  created_at?: string
}

const CACHE_KEY = 'cache_ts_cabins'
const CACHE_TTL = 300_000

export function useCabins() {
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  async function fetchCabins() {
    try {
      const lastSync = parseInt(localStorage.getItem(CACHE_KEY) || '0', 10)
      const cacheFresh = (Date.now() - lastSync) < CACHE_TTL

      const cached = await db.cabins.orderBy('sort_order').toArray()
      if (cached.length && cacheFresh) setCabins(cached)

      const { data, error } = await supabase.from('cabins').select('*').order('sort_order').order('name')
      if (error) throw error
      if (data) {
        setCabins(data)
        db.cabins.bulkPut(data)
        localStorage.setItem(CACHE_KEY, String(Date.now()))
      }
    } catch (err) {
      console.error('Failed to fetch cabins:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCabins() }, [])

  async function createCabin(cabin: Partial<Cabin>) {
    const { data } = await supabase.from('cabins').insert(cabin).select().single()
    if (data) { setCabins((prev) => [...prev, data]); db.cabins.put(data); toast.success('Cabin created') }
    return data
  }

  async function updateCabin(id: string, updates: Partial<Cabin>) {
    const original = cabins.find(c => c.id === id)
    setCabins((current) => current.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    const { data } = await supabase.from('cabins').update(updates).eq('id', id).select().single()
    if (data) { setCabins((current) => current.map((c) => (c.id === id ? data : c))); db.cabins.put(data); toast.success('Cabin updated') }
    else setCabins((current) => current.map((c) => (c.id === id ? original! : c)))
    return data
  }

  async function deleteCabin(id: string) {
    const current = cabins
    setCabins((prev) => prev.filter((c) => c.id !== id))
    try { await supabase.from('cabins').delete().eq('id', id); db.cabins.delete(id); toast.info('Cabin deleted') }
    catch { setCabins(current); toast.error('Failed to delete cabin') }
  }

  return { cabins, loading, createCabin, updateCabin, deleteCabin, refetch: fetchCabins }
}
