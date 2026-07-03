import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/features/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import MaintenancePage from './pages/MaintenancePage'
import MeetingsPage from './pages/MeetingsPage'
import CabinsPage from './pages/CabinsPage'
import UsersPage from './pages/UsersPage'

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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/cabins" element={<CabinsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
    </Routes>
  )
}
