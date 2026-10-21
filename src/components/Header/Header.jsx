import './Header.css'

function Header({ title, center, children }) {
  return (
    <header className={center ? 'header header--with-center' : 'header'}>
      <h1 className="header__title">{title}</h1>
      {center && <div className="header__center">{center}</div>}
      {children && <div className="header__actions">{children}</div>}
    </header>
  )
}

export default Header
