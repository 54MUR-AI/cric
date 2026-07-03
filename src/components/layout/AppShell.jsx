import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
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
