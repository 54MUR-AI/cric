import { useState, useEffect } from 'react'

export function useSWUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          setUpdateAvailable(true)
        }
      })
    }
  }, [])

  const activateUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
      })
    }
    setUpdateAvailable(false)
    window.location.reload()
  }

  return { updateAvailable, activateUpdate }
}
