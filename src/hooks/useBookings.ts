import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

interface CabinInfo {
  name: string
  color?: string
}

interface Booking {
  id: string
  cabin_id: string
  user_id: string
  start_date: string
  end_date: string
  guests?: string
  room?: string
  created_at?: string
  cabins?: CabinInfo
}

const CACHE_KEY = 'cache_ts_bookings'
const CACHE_TTL = 60_000

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const channelRef = useRef<any>(null)

  async function fetchBookings(isRetry = false) {
    try {
      setError(null)
      if (!isRetry) setLoading(true)
      const cached = await db.bookings.orderBy('start_date').toArray()
      if (cached.length) setBookings(cached)

      const { data, error } = await supabase
        .from('bookings')
        .select('*, cabins(name, color)')
        .order('start_date')
      if (error) throw error
      if (data) {
        setBookings(data)
        db.bookings.bulkPut(data)
        localStorage.setItem(CACHE_KEY, String(Date.now()))
      }
    } catch (err: any) {
      const msg = err?.message || 'Unknown error'
      console.error('Failed to fetch bookings:', msg)
      if (!isRetry) {
        setTimeout(() => fetchBookings(true), 2000)
        return
      }
      setError(msg)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchBookings()
    }
    const onFocus = () => fetchBookings()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    channelRef.current = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchBookings())
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      channelRef.current?.unsubscribe()
    }
  }, [])

  async function createBooking(booking: Partial<Booking>) {
    const { data, error } = await supabase.from('bookings').insert(booking).select().single()
    if (error) throw error
    if (data) {
      const { data: full } = await supabase
        .from('bookings')
        .select('*, cabins(name, color)')
        .eq('id', data.id)
        .single()
      if (full) { setBookings((prev) => [...prev, full]); db.bookings.put(full); toast.success('Booking created') }
    }
    return data
  }

  async function deleteBooking(id: string) {
    const current = bookings
    setBookings((prev) => prev.filter((b) => b.id !== id))
    try { await supabase.from('bookings').delete().eq('id', id); db.bookings.delete(id); toast.info('Booking cancelled') }
    catch { setBookings(current); toast.error('Failed to cancel booking') }
  }

  async function updateBooking(id: string, updates: Partial<Booking>) {
    const { error } = await supabase.from('bookings').update(updates).eq('id', id)
    if (error) throw error
    const { data: full } = await supabase
      .from('bookings')
      .select('*, cabins(name, color)')
      .eq('id', id)
      .single()
    if (full) { setBookings((prev) => prev.map((b) => b.id === id ? full : b)); db.bookings.put(full); toast.success('Booking updated') }
    return full
  }

  return { bookings, loading, error, createBooking, updateBooking, deleteBooking, refetch: fetchBookings }
}
