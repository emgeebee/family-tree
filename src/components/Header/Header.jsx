import './Header.css'

function Header({ title, children }) {
  return (
    <header className="header">
      <h1 className="header__title">{title}</h1>
      {children && <div className="header__actions">{children}</div>}
    </header>
  )
}

export default Header
