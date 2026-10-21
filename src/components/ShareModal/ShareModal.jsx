import { useEffect, useState } from 'react'
import { useTrees } from '../../hooks/useTrees.js'
import Modal from '../Modal/Modal.jsx'
import './ShareModal.css'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function withPermission(links, code, userid, permission) {
  return (links ?? []).map((link) => {
    if (link.code !== code) return link
    return {
      ...link,
      accessedBy: (link.accessedBy ?? []).map((access) =>
        access.userid === userid ? { ...access, permission } : access,
      ),
    }
  })
}

function AccessedBy({ code, accesses = [], updatingKey, onPermission }) {
  if (!accesses.length) return <p className="share-modal__muted">Not opened by anyone yet.</p>
  const sorted = [...accesses].sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt))
  return (
    <div className="share-modal__access">
      <span className="share-modal__muted">Accessed by</span>
      <ul>
        {sorted.map((access) => {
          const label = access.name ?? access.email ?? 'Unknown user'
          const permission = access.permission === 'write' ? 'write' : 'read'
          const key = `${code}:${access.userid}`
          return (
            <li key={access.userid}>
              <div className="share-modal__person">
                <span className="share-modal__viewer" title={access.email}>
                  {label}
                  {access.name && access.email && (
                    <span className="share-modal__muted"> {access.email}</span>
                  )}
                </span>
                <select
                  className="share-modal__permission"
                  aria-label={`Permission for ${label}`}
                  value={permission}
                  disabled={updatingKey === key}
                  onChange={(e) => onPermission(code, access.userid, e.target.value)}
                >
                  <option value="read">Can view</option>
                  <option value="write">Can edit</option>
                </select>
              </div>
              <span className="share-modal__muted">
                {access.accessCount === 1 ? 'Once' : `${access.accessCount} times`} · last{' '}
                {dateFormat.format(new Date(access.lastAccessedAt))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ShareModal({ treeId, onClose }) {
  const { index, shares } = useTrees()
  const name = index.find((e) => e.id === treeId)?.name ?? 'tree'
  const [links, setLinks] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)
  const [updatingKey, setUpdatingKey] = useState(null)

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

  const handlePermission = async (code, userid, permission) => {
    const current = links
      ?.find((link) => link.code === code)
      ?.accessedBy?.find((access) => access.userid === userid)
    const previous = current?.permission === 'write' ? 'write' : 'read'
    if (permission === previous) return

    setUpdatingKey(`${code}:${userid}`)
    setError(null)
    setLinks((list) => withPermission(list, code, userid, permission))
    try {
      await shares.setAccess(treeId, code, userid, permission)
    } catch (err) {
      setLinks((list) => withPermission(list, code, userid, previous))
      setError(err.message)
    } finally {
      setUpdatingKey(null)
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
        Anyone with a link can view this tree after signing in with Google. People who have
        opened it can be allowed to edit. Revoke a link to stop it working.
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
              <AccessedBy
                code={link.code}
                accesses={link.accessedBy}
                updatingKey={updatingKey}
                onPermission={handlePermission}
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

export default ShareModal
