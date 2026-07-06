import { useEffect, useRef } from 'react'
import { refreshAll, processPending } from './sync'
import { useAuth } from '../hooks/useAuth'

export function useSync() {
  const { user } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return
    refreshAll()
    intervalRef.current = setInterval(() => {
      refreshAll()
      processPending()
    }, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [user])

  useEffect(() => {
    if (!user) return
    const handleOnline = () => processPending()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [user])
}
