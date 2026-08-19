import { logout, type AuthUser } from './auth'

interface AccountBarProps {
  user: AuthUser
  onLoggedOut: () => void
}

export function AccountBar({ user, onLoggedOut }: AccountBarProps) {
  async function handleLogout() {
    await logout()
    onLoggedOut()
  }

  return (
    <div className="account-bar">
      <span>Logged in as {user.email}</span>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </div>
  )
}
