import { useEffect } from 'react'
import { useFocusTrap } from './useFocusTrap'

export default function Modal({ open, onClose, children, className = '', overlayClass = 'z-50', role = 'dialog', label }) {
  const trapRef = useFocusTrap(open)

  useEffect(() => {
    if (!open) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={`fixed inset-0 ${overlayClass} flex items-center justify-center bg-black/40`} onClick={onClose} role={role} aria-label={label} aria-modal="true">
      <div ref={trapRef} className={className} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
