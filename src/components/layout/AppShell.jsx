import { useState, useRef, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, RotateCcw, RefreshCw, Bell, BellOff } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import OfflineIndicator from '../ui/OfflineIndicator'
import { useSync } from '../../lib/useSync'
import { useSWUpdate } from '../../lib/useSWUpdate'
import { useKeyBindings } from '../../lib/useKeyBindings'
import { useInstallPrompt } from '../../lib/useInstallPrompt'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { useToast } from '../ui/Toast'
import { Download, X } from 'lucide-react'

function PullToRefresh({ onRefresh }) {
  const [pulling, setPulling] = useState(false)
  const [pullDist, setPullDist] = useState(0)
  const startY = useRef(0)

  const handleTouchStart = useCallback((e) => {
    if (e.currentTarget.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!pulling) return
    const dist = Math.max(0, (e.touches[0].clientY - startY.current) * 0.4)
    setPullDist(dist)
  }, [pulling])

  const handleTouchEnd = useCallback(() => {
    if (pullDist > 60) { onRefresh?.(); setPullDist(80) }
    setTimeout(() => { setPulling(false); setPullDist(0) }, 300)
  }, [pullDist, onRefresh])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pulling && pullDist > 0 && (
        <div className="absolute left-0 right-0 flex items-center justify-center transition-all z-10"
          style={{ height: Math.min(pullDist, 80), top: 0 }}>
          <RefreshCw className={`h-5 w-5 text-emerald-700 ${pullDist > 60 ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDist * 3}deg)` }} />
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const location = useLocation()
  useSync()
  const { updateAvailable, activateUpdate } = useSWUpdate()
  useKeyBindings()
  const { showInstall, install, dismiss } = useInstallPrompt()
  const { supported, enabled, toggle } = usePushNotifications()
  const toast = useToast()

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const handleBellClick = useCallback(async () => {
    if (!supported) {
      toast.error('Push notifications are not supported in this browser')
      return
    }
    
    // Check if Brave browser
    const isBrave = navigator.brave && typeof navigator.brave.isBrave === 'function'
    if (isBrave) {
      toast.warning('Brave blocks push notifications by default. Use Chrome or enable in brave://settings/content/notifications')
      return
    }
    
    toast.info('Updating notification settings...')
    
    try {
      const result = await toggle()
      if (result.ok) {
        toast.success(enabled ? 'Notifications disabled' : 'Notifications enabled')
      } else if (result.reason === 'denied') {
        toast.error('Notification permission denied. Check browser settings.')
      } else {
        toast.error(`Error: ${result.reason || 'unknown'}`)
      }
    } catch (err) {
      toast.error(`Failed: ${err.message}`)
    }
  }, [supported, enabled, toggle, toast])

  return (
    <div className="flex h-screen overflow-hidden">
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <OfflineIndicator />
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-700 text-white text-center text-xs py-1.5 flex items-center justify-center gap-1.5">
          <span>A new version is available</span>
          <button onClick={activateUpdate} className="inline-flex items-center gap-1 bg-white text-emerald-800 rounded-full px-2.5 py-0.5 font-medium hover:bg-emerald-50 transition-colors">
            <RotateCcw className="h-3 w-3" /> Update
          </button>
        </div>
      )}
      {showInstall && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:max-w-xs bg-emerald-900 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-700 flex items-center justify-center text-lg font-bold">CR</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install CRIC</p>
            <p className="text-xs text-emerald-200">Add to your home screen</p>
          </div>
          <button onClick={install} className="bg-white text-emerald-900 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-emerald-50 shrink-0">Install</button>
          <button onClick={dismiss} className="text-emerald-300 hover:text-white shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between bg-emerald-900 text-stone-100 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">CRIC Manager</span>
          <button
            onClick={handleBellClick}
            className="p-1 text-stone-300 hover:text-white transition-colors"
            title={enabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {enabled ? (
              <Bell className="h-5 w-5 text-emerald-400" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
          </button>
        </header>
        <header className="hidden md:flex items-center justify-end bg-emerald-900 text-stone-100 px-6 py-3">
          <div className="flex items-center gap-4">
            {updateAvailable && (
              <button onClick={activateUpdate} className="inline-flex items-center gap-1 bg-white text-emerald-800 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-emerald-50 transition-colors">
                <RotateCcw className="h-3 w-3" /> Update
              </button>
            )}
            <button
              onClick={handleBellClick}
              className="p-2 text-stone-300 hover:text-white transition-colors"
              title={enabled ? 'Disable notifications' : 'Enable notifications'}
            >
              {enabled ? (
                <Bell className="h-5 w-5 text-emerald-400" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0" key={refreshKey}>
          <PullToRefresh onRefresh={triggerRefresh} />
          <div className="p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
