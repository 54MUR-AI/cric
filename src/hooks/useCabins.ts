import { useEffect, useState, useRef } from 'react'
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
  const channelRef = useRef<any>(null)

  async function fetchCabins() {
    try {
      const cached = await db.cabins.orderBy('sort_order').toArray()
      if (cached.length) setCabins(cached)

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

  useEffect(() => {
    fetchCabins()

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCabins()
    }
    const onFocus = () => fetchCabins()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    channelRef.current = supabase
      .channel('cabins-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabins' }, () => fetchCabins())
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      channelRef.current?.unsubscribe()
    }
  }, [])

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
