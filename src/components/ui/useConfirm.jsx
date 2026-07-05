import { useState, useCallback } from 'react'
import ConfirmDialog from './ConfirmDialog'

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        onConfirm: () => { setConfirmState(null); resolve(true) },
        onCancel: () => { setConfirmState(null); resolve(false) },
      })
    })
  }, [])

  const ConfirmDialogComponent = confirmState ? (
    <ConfirmDialog
      open={true}
      title={confirmState.title || 'Confirm'}
      message={confirmState.message}
      confirmLabel={confirmState.confirmLabel}
      cancelLabel={confirmState.cancelLabel}
      variant={confirmState.variant}
      onConfirm={confirmState.onConfirm}
      onCancel={confirmState.onCancel}
    />
  ) : null

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}
