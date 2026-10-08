import { useEffect, useState } from 'react'
import { useTrees } from '../../hooks/useTrees.js'
import Modal from '../Modal/Modal.jsx'
import './ShareModal.css'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function ShareModal({ treeId, onClose }) {
  const { index, shares } = useTrees()
  const name = index.find((e) => e.id === treeId)?.name ?? 'tree'
  const [links, setLinks] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    let cancelled = false
    shares
      .list(treeId)
      .then((list) => {
        if (!cancelled) setLinks(list)
      })
      .catch((err) => {
        if (cancelled) return
        setLinks([])
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [shares, treeId])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const share = await shares.create(treeId)
      setLinks((current) => [share, ...(current ?? [])])
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (code) => {
    if (!window.confirm('Revoke this link? Anyone using it will lose access.')) return
    setError(null)
    try {
      await shares.revoke(treeId, code)
      setLinks((current) => current.filter((link) => link.code !== code))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(shares.url(code))
      setCopiedCode(code)
    } catch {
      setError('Could not copy – select the link and copy it manually.')
    }
  }

  return (
    <Modal title={`Share “${name}”`} onCancel={onClose} error={error}>
      <p className="modal__text share-modal__intro">
        Anyone with a link can view this tree after signing in with Google. They can’t change it.
        Revoke a link to stop it working.
      </p>

      <div>
        <button
          type="button"
          className="button button--primary"
          disabled={creating || links === null}
          onClick={handleCreate}
        >
          {creating ? 'Creating…' : 'Create share link'}
        </button>
      </div>

      {links === null && <p className="share-modal__muted">Loading share links…</p>}
      {links?.length === 0 && <p className="share-modal__muted">No share links yet.</p>}
      {links?.length > 0 && (
        <ul className="share-modal__list">
          {links.map((link) => (
            <li key={link.code} className="share-modal__link">
              <input
                readOnly
                aria-label="Share link"
                value={shares.url(link.code)}
                onFocus={(e) => e.target.select()}
              />
              <div className="share-modal__row">
                <span className="share-modal__muted">
                  Created {dateFormat.format(new Date(link.createdAt))}
                </span>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => handleCopy(link.code)}
                >
                  {copiedCode === link.code ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="button button--small button--danger"
                  onClick={() => handleRevoke(link.code)}
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

export default ShareModal
