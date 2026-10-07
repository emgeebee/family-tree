import { useState } from 'react'
import { uploadPhotos } from '../../services/api.js'
import PhotoLightbox from './PhotoLightbox.jsx'
import './PhotoGallery.css'

function PhotoGallery({ photos, profileUrl, onAdd, onRemove, onSetProfile }) {
  const [openIndex, setOpenIndex] = useState(null)
  const [uploading, setUploading] = useState(0)
  const [errors, setErrors] = useState([])

  const handleFiles = async (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setUploading(files.length)
    setErrors([])
    const result = await uploadPhotos(files)
    setUploading(0)
    setErrors(result.errors)
    if (result.urls.length) onAdd(result.urls)
  }

  return (
    <div className="photo-gallery">
      {photos.length > 0 && (
        <ul className="photo-gallery__grid">
          {photos.map((photo, index) => (
            <li key={photo.url}>
              <button
                type="button"
                className="photo-gallery__thumb"
                onClick={() => setOpenIndex(index)}
                aria-label={`Open photo ${index + 1} of ${photos.length}`}
              >
                <img src={photo.url} alt="" loading="lazy" />
                {photo.url === profileUrl && (
                  <span className="photo-gallery__badge" title="Profile photo">★</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={`button button--small${uploading ? ' is-disabled' : ''}`}>
        {uploading ? `Uploading ${uploading}…` : '+ Add photos'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          disabled={uploading > 0}
          onChange={handleFiles}
        />
      </label>

      {errors.length > 0 && (
        <ul className="photo-gallery__errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {openIndex !== null && photos[openIndex] && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          profileUrl={profileUrl}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onSetProfile={onSetProfile}
          onRemove={(url) => {
            if (!window.confirm('Remove this photo from the gallery?')) return
            onRemove(url)
            const remaining = photos.length - 1
            setOpenIndex(remaining ? Math.min(openIndex, remaining - 1) : null)
          }}
        />
      )}
    </div>
  )
}

export default PhotoGallery
