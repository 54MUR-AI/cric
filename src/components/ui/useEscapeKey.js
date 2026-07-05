import { useEffect } from 'react'

export function useEscapeKey(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e) => {
      if (e.key === 'Escape') onEscape?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onEscape, enabled])
}
