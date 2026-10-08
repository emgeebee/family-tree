import { useEffect } from 'react'
import './Modal.css'

/** A form dialog; without `onSubmit` it renders as a read-only dialog with a Close button. */
function Modal({
  title,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitDisabled,
  wide = false,
  error,
  onSubmit,
  onCancel,
  children,
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <form
        className={wide ? 'modal modal--wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (onSubmit) onSubmit()
          else onCancel()
        }}
      >
        <h2 id="modal-title" className="modal__title">{title}</h2>
        {children}
        {error && <p className="modal__error">{error}</p>}
        <div className="modal__actions">
          {onSubmit ? (
            <>
              <button type="button" className="button" onClick={onCancel}>{cancelLabel}</button>
              <button type="submit" className="button button--primary" disabled={submitDisabled}>
                {submitLabel}
              </button>
            </>
          ) : (
            <button type="submit" className="button button--primary" autoFocus>Close</button>
          )}
        </div>
      </form>
    </div>
  )
}

export default Modal
