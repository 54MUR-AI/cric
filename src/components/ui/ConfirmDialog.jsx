import { AlertTriangle } from 'lucide-react'
import Button from './Button'
import { useFocusTrap } from './useFocusTrap'
import ModalOverlay from './ModalOverlay'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  const trapRef = useFocusTrap(open)

  if (!open) return null
  return (
    <ModalOverlay onClose={onCancel} overlayClass="z-[9999]" ariaLabel={title || 'Confirm'}>
      <div ref={trapRef} className="max-w-sm max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl dark:shadow-black/30" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-rose-100 dark:bg-rose-900/30 p-2 shrink-0">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="font-semibold text-stone-800 dark:text-stone-200">{title}</h3>
            {message && <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </ModalOverlay>
  )
}
