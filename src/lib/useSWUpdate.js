import { useState, useEffect, useCallback } from 'react'

export function useSWUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(reg => {
      setRegistration(reg)

      if (reg.waiting) {
        setUpdateAvailable(true)
        return
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  const activateUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    setUpdateAvailable(false)
  }, [registration])

  return { updateAvailable, activateUpdate }
}
