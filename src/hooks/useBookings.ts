import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineWrite'
import { useToast } from '../components/ui/Toast'
import { notifyBookingAuthority } from './usePushNotifications'

interface CabinInfo {
  name: string
  color?: string
  booking_authority_id?: string
}

interface Booking {
  id: string
  cabin_id: string
  user_id: string
  start_date: string
  end_date: string
  guests?: string
  room?: string
  status?: string
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

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date')
      if (error) throw error

      const { data: cabinsData } = await supabase
        .from('cabins')
        .select('*')

      const cabinMap = new Map((cabinsData ?? []).map(c => [c.id, c]))

      if (bookingsData) {
        const merged = bookingsData.map(b => ({
          ...b,
          cabins: cabinMap.get(b.cabin_id) ? {
            name: cabinMap.get(b.cabin_id).name,
            color: cabinMap.get(b.cabin_id).color,
            booking_authority_id: cabinMap.get(b.cabin_id).booking_authority_id,
          } : undefined,
        }))
        setBookings(merged)
        db.bookings.bulkPut(merged)
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
    const { data, queued } = await offlineInsert('bookings', { ...booking, status: 'requested' })
    if (data) {
      if (!queued) {
        // Online: fetch full record with joins
        const { data: full } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', data.id)
          .single()
        if (full) {
          const { data: cabin } = await supabase.from('cabins').select('name, color, booking_authority_id').eq('id', full.cabin_id).single()
          if (cabin) full.cabins = cabin
          setBookings((prev) => [...prev, full]); db.bookings.put(full); toast.success('Booking requested')
          notifyBookingAuthority(full.id).catch(() => {})
        }
      } else {
        // Offline: optimistic record
        const optimistic = { ...booking, status: 'requested', id: data.id } as Booking
        setBookings((prev) => [...prev, optimistic]); db.bookings.put(optimistic)
        toast.info('Booking queued — will sync when online')
      }
    }
    return data
  }

  async function deleteBooking(id: string) {
    const current = bookings
    setBookings((prev) => prev.filter((b) => b.id !== id))
    try {
      const { queued } = await offlineDelete('bookings', id)
      db.bookings.delete(id)
      toast.info(queued ? 'Booking removal queued — will sync when online' : 'Booking cancelled')
    } catch { setBookings(current); toast.error('Failed to cancel booking') }
  }

  async function updateBooking(id: string, updates: Partial<Booking>) {
    const { data, queued } = await offlineUpdate('bookings', id, updates)
    if (!queued && data) {
      const { data: cabin } = await supabase.from('cabins').select('name, color, booking_authority_id').eq('id', data.cabin_id).single()
      if (cabin) data.cabins = cabin
      setBookings((prev) => prev.map((b) => b.id === id ? data : b)); db.bookings.put(data); toast.success('Booking updated')
    } else if (queued) {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, ...updates } : b))
      db.bookings.bulkPut(bookings.map(b => b.id === id ? { ...b, ...updates } : b))
      toast.info('Booking update queued — will sync when online')
    }
    return data
  }

  async function setBookingStatus(id: string, status: string) {
    const { data, queued } = await offlineUpdate('bookings', id, { status })
    if (!queued && data) {
      const { data: cabin } = await supabase.from('cabins').select('name, color, booking_authority_id').eq('id', data.cabin_id).single()
      if (cabin) data.cabins = cabin
      setBookings((prev) => prev.map((b) => b.id === id ? data : b)); db.bookings.put(data)
    } else if (queued) {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b))
      db.bookings.bulkPut(bookings.map(b => b.id === id ? { ...b, status } : b))
      toast.info('Status update queued — will sync when online')
    }
    return data
  }

  return { bookings, loading, error, createBooking, updateBooking, deleteBooking, setBookingStatus, refetch: fetchBookings }
}
