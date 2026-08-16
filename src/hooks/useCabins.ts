import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'
import type { CabinImprovement } from '../lib/db'

interface Cabin {
  id: string
  name: string
  color?: string
  description?: string
  sort_order?: number
  rooms?: string[]
  max_occupancy?: number
  booking_authority_id?: string
  improvements?: CabinImprovement[]
  created_at?: string
}

const CACHE_KEY = 'cache_ts_cabins'
const CACHE_TTL = 300_000

export function useCabins() {
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const channelRef = useRef<any>(null)

  async function fetchCabins(isRetry = false) {
    try {
      setError(null)
      if (!isRetry) setLoading(true)
      const cached = await db.cabins.orderBy('sort_order').toArray()
      if (cached.length) setCabins(cached)

      const [cabinRes, improvementRes] = await Promise.all([
        supabase.from('cabins').select('*').order('sort_order').order('name'),
        supabase.from('cabin_improvements').select('*').order('year', { ascending: false }),
      ])
      if (cabinRes.error) throw cabinRes.error
      if (improvementRes.error) throw improvementRes.error

      const improvements = improvementRes.data || []
      const data = (cabinRes.data || []).map((cabin: any) => ({
        ...cabin,
        improvements: improvements.filter((i: any) => i.cabin_id === cabin.id),
      }))
      if (data) {
        setCabins(data)
        db.cabins.bulkPut(data)
        db.cabin_improvements.bulkPut(improvements)
        localStorage.setItem(CACHE_KEY, String(Date.now()))
      }
    } catch (err: any) {
      const msg = err?.message || 'Unknown error'
      console.error('Failed to fetch cabins:', msg)
      if (!isRetry) {
        setTimeout(() => fetchCabins(true), 2000)
        return
      }
      setError(msg)
    }
    setLoading(false)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabin_improvements' }, () => fetchCabins())
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
    const { data, error } = await supabase.from('cabins').update(updates).eq('id', id).select().single()
    if (error) {
      setCabins((current) => current.map((c) => (c.id === id ? original! : c)))
      toast.error(error.message)
      return null
    }
    if (data) {
      setCabins((current) => current.map((c) => (c.id === id ? { ...data, improvements: original?.improvements } : c)))
      db.cabins.put({ ...data, improvements: original?.improvements })
      toast.success('Cabin updated')
    }
    else setCabins((current) => current.map((c) => (c.id === id ? original! : c)))
    return data
  }

  async function deleteCabin(id: string) {
    const current = cabins
    setCabins((prev) => prev.filter((c) => c.id !== id))
    try { await supabase.from('cabins').delete().eq('id', id); db.cabins.delete(id); toast.info('Cabin deleted') }
    catch { setCabins(current); toast.error('Failed to delete cabin') }
  }

  async function addImprovement(cabinId: string, year: number, description: string) {
    const { data, error } = await supabase
      .from('cabin_improvements')
      .insert({ cabin_id: cabinId, year, description })
      .select()
      .single()
    if (error) { toast.error(error.message); throw error }
    if (data) {
      db.cabin_improvements.put(data)
      setCabins((current) => current.map((c) => c.id === cabinId
        ? { ...c, improvements: [...(c.improvements || []), data].sort((a, b) => b.year - a.year) }
        : c))
      toast.success('Maintenance added')
    }
    return data
  }

  async function deleteImprovement(id: string, cabinId: string) {
    const { error } = await supabase.from('cabin_improvements').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    db.cabin_improvements.delete(id)
    setCabins((current) => current.map((c) => c.id === cabinId
      ? { ...c, improvements: (c.improvements || []).filter((i) => i.id !== id) }
      : c))
    toast.info('Maintenance deleted')
  }

  return { cabins, loading, error, createCabin, updateCabin, deleteCabin, addImprovement, deleteImprovement, refetch: fetchCabins }
}
