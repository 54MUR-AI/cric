import { useEscapeKey } from './useEscapeKey'
import { useFocusTrap } from './useFocusTrap'
import { KEY_BINDINGS } from '../../lib/useKeyBindings'

export default function KeyboardShortcutHelp({ open, onClose }) {
  useEscapeKey(() => onClose?.(), open)

  const ref = useFocusTrap(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 dark:bg-black/60" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={onClose}>
      <div ref={ref} className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl dark:shadow-black/30 border border-stone-200 dark:border-stone-700 max-w-sm w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-800 dark:text-stone-200">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-lg leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-2">
          {KEY_BINDINGS.map(({ combo, label }) => (
            <div key={combo} className="flex items-center justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-400">{label}</span>
              <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono text-xs border border-stone-200 dark:border-stone-600">
                {combo.split('+').map((k, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-0.5">+</span>}
                    <span className="uppercase font-semibold">{k}</span>
                  </span>
                ))}
              </kbd>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-stone-100 dark:border-stone-800 mt-2">
            <span className="text-stone-500 dark:text-stone-400">Show this help</span>
            <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono text-xs border border-stone-200 dark:border-stone-600">
              <span className="font-semibold">?</span>
            </kbd>
          </div>
        </div>
        <div className="px-5 py-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-700 text-center">
          <p className="text-[11px] text-stone-400 dark:text-stone-500">Press <kbd className="font-mono font-semibold text-stone-500 dark:text-stone-400">?</kbd> anytime to show this help</p>
        </div>
      </div>
    </div>
  )
}
