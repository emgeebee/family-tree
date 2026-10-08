import { useAuth } from '../../hooks/useAuth.js'
import './UserMenu.css'

function UserMenu() {
  const { user, signOut } = useAuth()
  if (!user) return null

  return (
    <div className="user-menu">
      {user.picture && (
        <img className="user-menu__avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
      )}
      <span className="user-menu__name" title={user.email}>
        {user.name ?? user.email}
      </span>
      <button type="button" className="button button--small" onClick={signOut}>
        Sign out
      </button>
    </div>
  )
}

export default UserMenu
