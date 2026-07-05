import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/features/auth/LoginPage'
import ErrorBoundary from './components/ui/ErrorBoundary'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'))
const CabinsPage = lazy(() => import('./pages/CabinsPage'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const RecordsPage = lazy(() => import('./pages/RecordsPage'))
const PhotosPage = lazy(() => import('./pages/PhotosPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'))
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-stone-500"><div className="h-6 w-6 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" /><p>Connecting to server…</p></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-stone-500">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
        <p>Connecting to server…</p>
        <p className="text-xs">If this takes more than a few seconds, Supabase may be temporarily unavailable. Try again shortly.</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/update-password" element={<Suspense fallback={<PageFallback />}><UpdatePasswordPage /></Suspense>} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><DashboardPage /></Suspense></ErrorBoundary>} />
        <Route path="/schedule" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><SchedulePage /></Suspense></ErrorBoundary>} />
        <Route path="/maintenance" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><MaintenancePage /></Suspense></ErrorBoundary>} />
        <Route path="/meetings" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><MeetingsPage /></Suspense></ErrorBoundary>} />
        <Route path="/cabins" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CabinsPage /></Suspense></ErrorBoundary>} />
        <Route path="/guide" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><GuidePage /></Suspense></ErrorBoundary>} />
        <Route path="/records" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><RecordsPage /></Suspense></ErrorBoundary>} />
        <Route path="/map" element={<Navigate to="/" replace />} />
        <Route path="/photos" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><PhotosPage /></Suspense></ErrorBoundary>} />
        <Route path="/users" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><UsersPage /></Suspense></ErrorBoundary>} />
        <Route path="/emergency" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><EmergencyPage /></Suspense></ErrorBoundary>} />
        <Route path="/boat-schedule" element={<Navigate to="/schedule" replace />} />
      </Route>
    </Routes>
  )
}
