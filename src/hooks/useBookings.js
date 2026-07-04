import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import db from '../lib/db'
import { useToast } from '../components/ui/Toast'

export function useBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  async function fetchBookings() {
    const cached = await db.bookings.orderBy('start_date').toArray()
    if (cached.length) setBookings(cached)
    const { data } = await supabase
      .from('bookings')
      .select('*, cabins(name, color)')
      .order('start_date')
    if (data) { setBookings(data); db.bookings.bulkPut(data) }
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [])

  async function createBooking(booking) {
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

  async function deleteBooking(id) {
    const prev = bookings
    setBookings((prev) => prev.filter((b) => b.id !== id))
    try { await supabase.from('bookings').delete().eq('id', id); db.bookings.delete(id); toast.info('Booking cancelled') }
    catch { setBookings(prev); toast.error('Failed to cancel booking') }
  }

  return { bookings, loading, createBooking, deleteBooking, refetch: fetchBookings }
}
