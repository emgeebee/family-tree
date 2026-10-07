import './Avatar.css'

function Avatar({ src, size = 52 }) {
  return (
    <div className="avatar" style={{ width: size, height: size }} aria-hidden="true">
      {src ? (
        <img src={src} alt="" draggable="false" />
      ) : (
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="24" r="12" />
          <path d="M10 60c0-13 10-21 22-21s22 8 22 21z" />
        </svg>
      )}
    </div>
  )
}

export default Avatar
