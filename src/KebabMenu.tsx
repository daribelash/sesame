import { useState } from 'react'
import { logout } from './auth'
import { KebabIcon } from './icons'

interface KebabMenuProps {
  onLoggedOut: () => void
}

// Small button + dropdown, one item: Log out. Replaces the always-visible
// account bar per the redesign — identity itself isn't shown in the header,
// only the action.
export function KebabMenu({ onLoggedOut }: KebabMenuProps) {
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    setOpen(false)
    await logout()
    onLoggedOut()
  }

  return (
    <div className="kebab-menu">
      <button
        type="button"
        className="kebab-menu-button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <KebabIcon />
      </button>
      {open && (
        <ul className="kebab-menu-dropdown">
          <li>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
