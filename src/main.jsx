import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { NotificationProvider } from './hooks/useNotifications'
import App from './App'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
