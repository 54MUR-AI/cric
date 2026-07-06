import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from '../components/ui/Toast'
import { usePushNotifications } from './usePushNotifications'

interface NotificationContextValue {}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const RECENT_WINDOW = 5

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const { subscribe } = usePushNotifications()
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(sessionStorage.getItem('notif-seen') || '[]')) } catch { return new Set() }
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const markSeen = useCallback((ids: string[]) => {
    setSeenIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      sessionStorage.setItem('notif-seen', JSON.stringify([...next]))
      return next
    })
  }, [])

  useEffect(() => {
    if (!user) return

    const cutoff = new Date(Date.now() - RECENT_WINDOW * 60 * 1000).toISOString()

    async function check() {
      try {
        const [bookings, tasks, trips] = await Promise.all([
          supabase.from('bookings').select('id, user_id, start_date, end_date, cabins(name)').gt('created_at', cutoff).order('created_at', { ascending: false }),
          supabase.from('maintenance_tasks').select('id, created_by, title, due_date').gt('created_at', cutoff).order('created_at', { ascending: false }),
          supabase.from('boat_trips').select('id, created_by, trip_date, departure_time, destination').gt('created_at', cutoff).order('created_at', { ascending: false }),
        ])

        const newBookings = (bookings.data || []).filter(b => b.user_id !== user.id && !seenIds.has(`b-${b.id}`))
        const newTasks = (tasks.data || []).filter(t => t.created_by !== user.id && !seenIds.has(`t-${t.id}`))
        const newTrips = (trips.data || []).filter(t => t.created_by !== user.id && !seenIds.has(`tr-${t.id}`))

        const ids: string[] = []

        newBookings.forEach(b => {
          ids.push(`b-${b.id}`)
          toast.info(`${(b.cabins as any)?.name || 'Cabin'} booked ${b.start_date?.slice(5)}–${b.end_date?.slice(5)}`)
        })
        newTasks.forEach(t => {
          ids.push(`t-${t.id}`)
          toast.info(`New task: ${t.title}`)
        })
        newTrips.forEach(t => {
          ids.push(`tr-${t.id}`)
          toast.info(`New boat trip: ${t.destination} on ${t.trip_date?.slice(5)}`)
        })

        if (ids.length) markSeen(ids)
      } catch {}
    }

    check()
    intervalRef.current = setInterval(check, 60000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [user, seenIds, markSeen, toast, subscribe])

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  return ctx ?? {}
}
