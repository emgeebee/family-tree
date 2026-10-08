import { useRef, useState } from 'react'
import sampleTree from '../../data/sampleTree.json'
import { useAuth } from '../../hooks/useAuth.js'
import { useTrees } from '../../hooks/useTrees.js'
import { readTreeFile } from '../../services/fileTransfer.js'
import { copyTree, createBlankTree, renameTree, treeName } from '../../utils/trees.js'
import './TreeLibrary.css'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Enter would submit the surrounding dialog form, so handle it here instead. */
const onEnter = (fn) => (e) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  fn()
}

function NewTreeForm({ onCreate }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const create = (tree) => {
    setError(null)
    setName('')
    onCreate(tree)
  }

  const createBlank = () =>
    create(
      createBlankTree({
        name: name || 'My family',
        person: { given_name: user.givenName, surname: user.familyName },
      }),
    )

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const tree = await readTreeFile(file)
      create(name.trim() ? renameTree(tree, name) : tree)
    } catch (err) {
      setError(err instanceof SyntaxError ? 'This file is not valid JSON.' : err.message)
    }
  }

  return (
    <section className="tree-library__new">
      <h3>New tree</h3>
      <label className="form-field">
        <span>Name</span>
        <input
          value={name}
          placeholder="e.g. Smith family"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onEnter(createBlank)}
        />
      </label>
      <div className="tree-library__buttons">
        <button type="button" className="button button--primary" onClick={createBlank}>
          Start from scratch
        </button>
        <button
          type="button"
          className="button"
          onClick={() => create(copyTree(sampleTree, name || treeName(sampleTree)))}
        >
          Sample family
        </button>
        <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
          Import JSON…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
      </div>
      {error && <p className="modal__error">{error}</p>}
    </section>
  )
}

function TreeRow({ entry, isActive, onOpen, onShare, onError }) {
  const { renameTree: rename, duplicateTree, deleteTree } = useTrees()
  const [draftName, setDraftName] = useState(null)
  const [busy, setBusy] = useState(false)

  const saveName = () => {
    if (draftName.trim()) rename(entry.id, draftName)
    setDraftName(null)
  }

  const handleDelete = async () => {
    const message = `Delete "${entry.name}"? This can't be undone, and its share links will stop working.`
    if (!window.confirm(message)) return
    setBusy(true)
    onError(null)
    try {
      await deleteTree(entry.id)
    } catch (err) {
      onError(err.message)
      setBusy(false)
    }
  }

  if (draftName !== null) {
    return (
      <li className="tree-library__row">
        <input
          className="tree-library__rename"
          aria-label="Tree name"
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setDraftName(null)
            } else onEnter(saveName)(e)
          }}
        />
        <div className="tree-library__actions">
          <button type="button" className="button button--small button--primary" onClick={saveName}>
            Save
          </button>
          <button type="button" className="button button--small" onClick={() => setDraftName(null)}>
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className={`tree-library__row${isActive ? ' tree-library__row--active' : ''}`}>
      <button
        type="button"
        className="tree-library__open"
        onClick={() => onOpen(entry.id)}
        disabled={busy}
      >
        <span className="tree-library__name">{entry.name}</span>
        <span className="tree-library__meta">
          {isActive ? 'Open now · ' : ''}
          {entry.updatedAt ? `Updated ${dateFormat.format(new Date(entry.updatedAt))}` : 'Not saved yet'}
        </span>
      </button>
      <div className="tree-library__actions">
        <button
          type="button"
          className="button button--small"
          disabled={busy}
          onClick={() => setDraftName(entry.name)}
        >
          Rename
        </button>
        <button
          type="button"
          className="button button--small"
          disabled={busy}
          onClick={() => duplicateTree(entry.id)}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="button button--small"
          disabled={busy}
          onClick={() => onShare(entry.id)}
        >
          Share
        </button>
        <button
          type="button"
          className="button button--small button--danger"
          disabled={busy}
          onClick={handleDelete}
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  )
}

/** Lists the user's trees with open/rename/duplicate/share/delete, plus new-tree options. */
function TreeLibrary({ onOpen, onShare }) {
  const { index, activeId, openTree, createTree } = useTrees()
  const [error, setError] = useState(null)

  const open = (id) => {
    openTree(id)
    onOpen?.()
  }

  return (
    <div className="tree-library">
      {index.length > 0 && (
        <ul className="tree-library__list">
          {index.map((entry) => (
            <TreeRow
              key={entry.id}
              entry={entry}
              isActive={entry.id === activeId}
              onOpen={open}
              onShare={onShare}
              onError={setError}
            />
          ))}
        </ul>
      )}
      {error && <p className="modal__error">{error}</p>}
      <NewTreeForm
        onCreate={(tree) => {
          createTree(tree)
          onOpen?.()
        }}
      />
    </div>
  )
}

export default TreeLibrary
