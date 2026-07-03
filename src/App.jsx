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
const MapPage = lazy(() => import('./pages/MapPage'))
const PhotosPage = lazy(() => import('./pages/PhotosPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center text-stone-500">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-stone-500">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><DashboardPage /></Suspense></ErrorBoundary>} />
        <Route path="/schedule" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><SchedulePage /></Suspense></ErrorBoundary>} />
        <Route path="/maintenance" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><MaintenancePage /></Suspense></ErrorBoundary>} />
        <Route path="/meetings" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><MeetingsPage /></Suspense></ErrorBoundary>} />
        <Route path="/cabins" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><CabinsPage /></Suspense></ErrorBoundary>} />
        <Route path="/guide" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><GuidePage /></Suspense></ErrorBoundary>} />
        <Route path="/records" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><RecordsPage /></Suspense></ErrorBoundary>} />
        <Route path="/map" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><MapPage /></Suspense></ErrorBoundary>} />
        <Route path="/photos" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><PhotosPage /></Suspense></ErrorBoundary>} />
        <Route path="/users" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><UsersPage /></Suspense></ErrorBoundary>} />
      </Route>
    </Routes>
  )
}
