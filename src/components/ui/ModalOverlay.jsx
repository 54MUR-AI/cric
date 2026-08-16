import { useEffect } from 'react'

// Shared overlay shell: bottom sheet on mobile, centered dialog on desktop.
// Scrolls instead of clipping when content exceeds the viewport, so nothing
// gets cut off on small screens (or when the on-screen keyboard opens).
export default function ModalOverlay({ onClose, children, className = '', overlayClass = 'z-50', ariaLabel, role = 'dialog' }) {
  useEffect(() => {
    if (!onClose) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className={`fixed inset-0 ${overlayClass} overflow-y-auto bg-black/40`} onClick={onClose} role={role} aria-label={ariaLabel} aria-modal="true">
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div className={`w-full animate-slide-up ${className}`} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>
  )
}
