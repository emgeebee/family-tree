import { useRef } from 'react'
import { useFamilyTree } from '../../hooks/useFamilyTree.js'
import { downloadTree, readTreeFile } from '../../services/fileTransfer.js'
import './DataMenu.css'

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

function BackupStatus({ status }) {
  switch (status.state) {
    case 'saving':
      return <span className="data-menu__status">Backing up…</span>
    case 'saved':
      return (
        <span className="data-menu__status">Backed up {timeFormat.format(status.at)}</span>
      )
    case 'error':
      return (
        <span className="data-menu__status data-menu__status--error" title={status.message}>
          Backup failed – changes are only saved in this browser
        </span>
      )
    default:
      return null
  }
}

function DataMenu() {
  const { state, actions, backupStatus } = useFamilyTree()
  const fileInputRef = useRef(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      actions.load(await readTreeFile(file))
    } catch (err) {
      window.alert(err instanceof SyntaxError ? 'This file is not valid JSON.' : err.message)
    }
  }

  const handleReset = () => {
    if (window.confirm('Replace the current tree with the sample family? This cannot be undone.')) {
      actions.resetToSample()
    }
  }

  return (
    <div className="data-menu">
      <BackupStatus status={backupStatus} />
      <button
        type="button"
        className="button button--small"
        onClick={() => downloadTree(state.tree)}
      >
        Export
      </button>
      <button
        type="button"
        className="button button--small"
        onClick={() => fileInputRef.current?.click()}
      >
        Import
      </button>
      <button type="button" className="button button--small" onClick={handleReset}>
        Reset sample
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImport}
      />
    </div>
  )
}

export default DataMenu
