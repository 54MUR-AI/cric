import { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { processPending } from '../../lib/sync'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => { setOnline(true); processPending() }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs py-1.5 flex items-center justify-center gap-1.5">
      <WifiOff className="h-3 w-3" /> You're offline — changes will sync when you reconnect
    </div>
  )
}
