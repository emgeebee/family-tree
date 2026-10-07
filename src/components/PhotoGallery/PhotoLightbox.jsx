import { useEffect } from 'react'

function PhotoLightbox({
  photos,
  index,
  profileUrl,
  onIndexChange,
  onClose,
  onSetProfile,
  onRemove,
}) {
  const photo = photos[index]
  const count = photos.length
  const go = (delta) => onIndexChange((index + delta + count) % count)

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onIndexChange((index - 1 + count) % count)
      else if (e.key === 'ArrowRight') onIndexChange((index + 1) % count)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, count, onClose, onIndexChange])

  const isProfile = photo.url === profileUrl

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <button type="button" className="lightbox__close" aria-label="Close" onClick={onClose}>
        ×
      </button>

      {count > 1 && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation()
            go(-1)
          }}
        >
          ‹
        </button>
      )}

      <img
        className="lightbox__image"
        src={photo.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />

      {count > 1 && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation()
            go(1)
          }}
        >
          ›
        </button>
      )}

      <div className="lightbox__toolbar" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox__counter">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          className="button button--small"
          disabled={isProfile}
          onClick={() => onSetProfile(photo.url)}
        >
          {isProfile ? '★ Profile photo' : 'Set as profile photo'}
        </button>
        <button
          type="button"
          className="button button--small button--danger"
          onClick={() => onRemove(photo.url)}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export default PhotoLightbox
