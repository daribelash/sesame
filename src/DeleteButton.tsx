import { useState } from 'react'
import { CloseIcon } from './icons'

interface DeleteButtonProps {
  label: string
  onConfirm: () => void
  /** 'link' (default) is a bare text link, for minor inline deletes like an
   * address row. 'outline' is a bordered button, for a primary destructive
   * action paired with Edit in a button row. 'icon' is a bare × icon, for a
   * compact delete affordance next to a list item. */
  variant?: 'link' | 'outline' | 'icon'
  /** Notified when the confirm step opens/closes — lets a parent hide
   * unrelated actions (like Edit) while a delete is armed. */
  onArmedChange?: (armed: boolean) => void
}

// Two-step inline confirm rather than window.confirm — a native dialog
// blocks the whole page, which is heavier than a destructive-but-recoverable
// (soft-delete) action needs.
export function DeleteButton({ label, onConfirm, variant = 'link', onArmedChange }: DeleteButtonProps) {
  const [armed, setArmed] = useState(false)

  function arm() {
    setArmed(true)
    onArmedChange?.(true)
  }

  function disarm() {
    setArmed(false)
    onArmedChange?.(false)
  }

  if (!armed) {
    if (variant === 'icon') {
      return (
        <button type="button" className="icon-button-delete" onClick={arm} aria-label={label}>
          <CloseIcon size={14} />
        </button>
      )
    }
    const className = variant === 'outline' ? 'btn-ghost-danger' : 'link-button danger'
    return (
      <button type="button" className={className} onClick={arm}>
        {label}
      </button>
    )
  }

  return (
    <span className="delete-confirm">
      <button type="button" className="btn-danger" onClick={onConfirm}>
        Confirm delete
      </button>
      <button type="button" className="link-button" onClick={disarm}>
        Cancel
      </button>
    </span>
  )
}
