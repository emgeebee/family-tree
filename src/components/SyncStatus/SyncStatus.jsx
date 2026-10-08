import './SyncStatus.css'

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

function SyncStatus({ status }) {
  switch (status.state) {
    case 'loading':
      return <span className="sync-status">Loading…</span>
    case 'saving':
      return <span className="sync-status">Saving…</span>
    case 'saved':
      return <span className="sync-status">Saved {timeFormat.format(status.at)}</span>
    case 'error':
      return (
        <span className="sync-status sync-status--error" title={status.message}>
          Not saved to the server – changes are kept in this browser
        </span>
      )
    default:
      return null
  }
}

export default SyncStatus
