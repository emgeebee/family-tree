import { useEffect, useRef, useState } from 'react'
import { fetchBackup, saveBackup } from '../services/api.js'
import { isValidTree } from '../utils/familyModel.js'
import { useAuth } from './useAuth.js'

const BACKUP_DELAY_MS = 1500

/**
 * Pushes the tree to the server shortly after each change. When the browser
 * had no saved tree, the server's latest backup is restored first so the
 * sample data never overwrites a real backup.
 */
export function useServerBackup(tree, { hasLocalTree, onRestore }) {
  const { getToken } = useAuth()
  const [status, setStatus] = useState({ state: 'idle' })
  const [ready, setReady] = useState(hasLocalTree)
  const lastSavedRef = useRef(hasLocalTree ? null : tree)
  const onRestoreRef = useRef(onRestore)

  useEffect(() => {
    if (hasLocalTree) return
    let cancelled = false
    fetchBackup(getToken())
      .then((backup) => {
        if (cancelled || !isValidTree(backup)) return
        lastSavedRef.current = backup
        onRestoreRef.current(backup)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [hasLocalTree, getToken])

  useEffect(() => {
    if (!ready || tree === lastSavedRef.current) return
    const timer = setTimeout(async () => {
      setStatus({ state: 'saving' })
      try {
        await saveBackup(tree, getToken())
        lastSavedRef.current = tree
        setStatus({ state: 'saved', at: new Date() })
      } catch (err) {
        setStatus({ state: 'error', message: err.message })
      }
    }, BACKUP_DELAY_MS)
    return () => clearTimeout(timer)
  }, [tree, ready, getToken])

  return status
}
