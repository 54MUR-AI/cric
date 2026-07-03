import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, RotateCcw } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import OfflineIndicator from '../ui/OfflineIndicator'
import { useSync } from '../../lib/useSync'
import { useSWUpdate } from '../../lib/useSWUpdate'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useSync()
  const { updateAvailable, activateUpdate } = useSWUpdate()

  return (
    <div className="flex h-screen overflow-hidden">
      <OfflineIndicator />
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-700 text-white text-center text-xs py-1.5 flex items-center justify-center gap-1.5">
          <span>A new version is available</span>
          <button onClick={activateUpdate} className="inline-flex items-center gap-1 bg-white text-emerald-800 rounded-full px-2.5 py-0.5 font-medium hover:bg-emerald-50 transition-colors">
            <RotateCcw className="h-3 w-3" /> Update
          </button>
        </div>
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between bg-emerald-900 text-stone-100 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">CRIC Island Manager</span>
          <div className="w-7" />
        </header>
        <main className="flex-1 overflow-y-auto bg-stone-50 pb-16 md:pb-0">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
