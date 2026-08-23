import { useEffect, useState } from 'react'
import { CloseIcon } from './icons'

interface DeleteButtonProps {
  /** Trigger's accessible label, e.g. "Delete gate" or "Delete address". */
  label: string
  onConfirm: () => void
  /** Modal heading, e.g. "Delete this gate?" */
  title: string
  /** Modal body copy — names what's affected and whether it's reversible. */
  description: string
  /** 'outline' (default) is a bordered button, for a primary destructive
   * action paired with Edit in a button row. 'icon' is a bare × icon, for a
   * compact delete affordance next to a list item. */
  trigger?: 'outline' | 'icon'
  /** Notified when the confirm dialog opens/closes — lets a parent hide
   * unrelated actions (like Edit) while a delete is pending confirmation. */
  onArmedChange?: (armed: boolean) => void
}

// Every delete in this app is destructive enough (loses a gate's whole code
// history, or unlinks an address) to warrant a real confirmation step. A
// blocking modal dialog gets that weight without reaching for the native
// window.confirm, which can't be styled, ignores dark mode, and is awkward
// to test.
export function DeleteButton({
  label,
  onConfirm,
  title,
  description,
  trigger = 'outline',
  onArmedChange,
}: DeleteButtonProps) {
  const [armed, setArmed] = useState(false)

  function arm() {
    setArmed(true)
    onArmedChange?.(true)
  }

  function disarm() {
    setArmed(false)
    onArmedChange?.(false)
  }

  useEffect(() => {
    if (!armed) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setArmed(false)
        onArmedChange?.(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [armed, onArmedChange])

  return (
    <>
      {trigger === 'icon' ? (
        <button type="button" className="icon-button-delete" onClick={arm} aria-label={label}>
          <CloseIcon size={14} />
        </button>
      ) : (
        <button type="button" className="btn-ghost-danger" onClick={arm}>
          {label}
        </button>
      )}
      {armed && (
        <div
          className="confirm-backdrop"
          onClick={(event) => {
            event.stopPropagation()
            disarm()
          }}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="btn-row">
              <button type="button" className="btn-secondary" onClick={disarm}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={onConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
