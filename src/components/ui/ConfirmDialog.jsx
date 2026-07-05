import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30 mx-4" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-rose-100 dark:bg-rose-900/30 p-2 shrink-0">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-stone-800 dark:text-stone-200">{title}</h3>
            {message && <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
