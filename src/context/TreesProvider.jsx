import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import * as api from '../services/api.js'
import { clearLegacyTree, createTreeCache, loadLegacyTree } from '../services/storage.js'
import { copyTree, newTreeId, renameTree, sortTrees, treeName } from '../utils/trees.js'
import { TreesContext } from './treesContext.js'

const SAVE_DELAY_MS = 1500
/** Id of the single tree that was backed up before multiple trees existed. */
const LEGACY_TREE_ID = 'family-tree'
const SHARE_PARAM = 'share'

function indexEntry(id, tree, updatedAt = new Date().toISOString()) {
  return { id, name: treeName(tree), updatedAt }
}

function upsert(index, entry) {
  return sortTrees([...index.filter((e) => e.id !== entry.id), entry])
}

/** Moves the old single-tree localStorage copy into this user's cache. */
function migrateLegacyTree(cache) {
  const legacy = loadLegacyTree()
  if (!legacy) return
  if (!cache.loadTree(LEGACY_TREE_ID)) {
    cache.saveTree(LEGACY_TREE_ID, { tree: legacy, pending: true, version: 1 })
    cache.saveIndex(upsert(cache.loadIndex(), indexEntry(LEGACY_TREE_ID, legacy)))
  }
  clearLegacyTree()
}

function readShareCode() {
  return new URLSearchParams(window.location.search).get(SHARE_PARAM)
}

function shareUrl(code) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(SHARE_PARAM, code)
  return url.toString()
}

function clearShareCode() {
  const url = new URL(window.location.href)
  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState(null, '', url)
}

/**
 * The server holds the master copy of each tree; the browser cache shows
 * trees instantly and keeps edits that haven't been uploaded yet (`pending`).
 */
function TreesProvider({ children }) {
  const { user, getToken } = useAuth()
  const cache = useMemo(() => createTreeCache(user.id), [user.id])

  const [index, setIndex] = useState(() => {
    migrateLegacyTree(cache)
    return cache.loadIndex()
  })
  const [activeId, setActiveId] = useState(() => cache.loadActiveId())
  const [revision, setRevision] = useState(0)
  const [status, setStatus] = useState({ state: 'loading' })
  const [shared, setShared] = useState(() => {
    const code = readShareCode()
    return code ? { code, state: 'loading' } : null
  })

  const commitIndex = useCallback(
    (update) =>
      setIndex((prev) => {
        const next = update(prev)
        if (next !== prev) cache.saveIndex(next)
        return next
      }),
    [cache],
  )

  const sync = useMemo(() => {
    const timers = new Map()
    const running = new Map()

    async function push(id) {
      const entry = cache.loadTree(id)
      if (!entry?.pending) return
      setStatus({ state: 'saving' })
      try {
        const doc = await api.saveTree(getToken(), id, entry.tree)
        const latest = cache.loadTree(id)
        if (latest?.version === entry.version) cache.saveTree(id, { ...latest, pending: false })
        setIndex((prev) => {
          const next = prev.map((e) => (e.id === id ? { ...e, updatedAt: doc.updatedAt } : e))
          cache.saveIndex(next)
          return next
        })
        setStatus({ state: 'saved', at: new Date() })
      } catch (err) {
        setStatus({ state: 'error', message: err.message })
        throw err
      }
    }

    // Saves of the same tree run one after another so an older copy never wins.
    function save(id) {
      clearTimeout(timers.get(id))
      timers.delete(id)
      const next = (running.get(id) ?? Promise.resolve()).catch(() => {}).then(() => push(id))
      running.set(id, next)
      next
        .finally(() => {
          if (running.get(id) === next) running.delete(id)
        })
        .catch(() => {})
      return next
    }

    function schedule(id, delay = SAVE_DELAY_MS) {
      clearTimeout(timers.get(id))
      timers.set(
        id,
        setTimeout(() => save(id).catch(() => {}), delay),
      )
    }

    function cancel(id) {
      clearTimeout(timers.get(id))
      timers.delete(id)
    }

    function cancelAll() {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }

    return { save, schedule, cancel, cancelAll }
  }, [cache, getToken])

  useEffect(() => () => sync.cancelAll(), [sync])

  useEffect(() => {
    let cancelled = false
    api
      .listTrees(getToken())
      .then((records) => {
        if (cancelled) return
        const serverIds = new Set(records.map((r) => r.id))
        const entries = records.map((record) => {
          const local = cache.loadTree(record.id)
          if (local?.pending) return indexEntry(record.id, local.tree, record.updatedAt)
          cache.saveTree(record.id, { tree: record.tree, pending: false, version: 0 })
          return { id: record.id, name: record.name, updatedAt: record.updatedAt }
        })
        for (const entry of cache.loadIndex()) {
          if (serverIds.has(entry.id)) continue
          if (cache.loadTree(entry.id)?.pending) entries.push(entry)
          else cache.removeTree(entry.id)
        }

        const next = sortTrees(entries)
        cache.saveIndex(next)
        setIndex(next)
        setActiveId((current) => {
          const id = next.some((e) => e.id === current) ? current : (next[0]?.id ?? null)
          cache.saveActiveId(id)
          return id
        })
        setRevision((r) => r + 1)
        setStatus({ state: 'idle' })
        for (const entry of next) {
          if (cache.loadTree(entry.id)?.pending) sync.schedule(entry.id, 0)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setStatus({
          state: 'error',
          message: `${err.message} – showing trees saved in this browser`,
        })
      })
    return () => {
      cancelled = true
    }
  }, [cache, getToken, sync])

  const sharedCode = shared?.code
  useEffect(() => {
    if (!sharedCode) return
    let cancelled = false
    api
      .fetchSharedTree(getToken(), sharedCode)
      .then((record) => {
        if (!cancelled) setShared({ code: sharedCode, state: 'ready', ...record })
      })
      .catch((err) => {
        if (!cancelled) setShared({ code: sharedCode, state: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [sharedCode, getToken])

  const openTree = useCallback(
    (id) => {
      cache.saveActiveId(id)
      setActiveId(id)
    },
    [cache],
  )

  const updateTree = useCallback(
    (id, tree) => {
      const prev = cache.loadTree(id)
      cache.saveTree(id, { tree, pending: true, version: (prev?.version ?? 0) + 1 })
      commitIndex((idx) => {
        const existing = idx.find((e) => e.id === id)
        return existing?.name === treeName(tree) ? idx : upsert(idx, indexEntry(id, tree))
      })
      sync.schedule(id)
    },
    [cache, commitIndex, sync],
  )

  const createTree = useCallback(
    (tree) => {
      const id = newTreeId()
      updateTree(id, tree)
      sync.save(id).catch(() => {})
      openTree(id)
      return id
    },
    [updateTree, sync, openTree],
  )

  const duplicateTree = useCallback(
    (id) => {
      const entry = cache.loadTree(id)
      if (entry) createTree(copyTree(entry.tree, `${treeName(entry.tree)} (copy)`))
    },
    [cache, createTree],
  )

  const rename = useCallback(
    (id, name) => {
      const entry = cache.loadTree(id)
      if (!entry) return
      updateTree(id, renameTree(entry.tree, name))
      if (id === activeId) setRevision((r) => r + 1)
    },
    [cache, updateTree, activeId],
  )

  const deleteTree = useCallback(
    async (id) => {
      sync.cancel(id)
      await api.deleteTree(getToken(), id)
      cache.removeTree(id)
      const remaining = index.filter((e) => e.id !== id)
      commitIndex(() => remaining)
      if (activeId === id) openTree(remaining[0]?.id ?? null)
    },
    [sync, getToken, cache, index, commitIndex, activeId, openTree],
  )

  const getTree = useCallback((id) => cache.loadTree(id)?.tree ?? null, [cache])

  const shares = useMemo(
    () => ({
      list: (id) => api.listShares(getToken(), id),
      create: async (id) => {
        if (cache.loadTree(id)?.pending) await sync.save(id)
        return api.createShare(getToken(), id)
      },
      revoke: (id, code) => api.revokeShare(getToken(), id, code),
      url: shareUrl,
    }),
    [getToken, cache, sync],
  )

  const closeShared = useCallback(() => {
    clearShareCode()
    setShared(null)
  }, [])

  const editorKey = activeId ? `${activeId}:${revision}` : null
  // Re-read from the cache only when the editor is (re)mounted; edits flow out via updateTree.
  const activeTree = useMemo(
    () => (editorKey ? getTree(activeId) : null),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [editorKey, getTree],
  )

  const value = useMemo(
    () => ({
      index,
      activeId,
      activeTree,
      editorKey,
      status,
      shared,
      openTree,
      updateTree,
      createTree,
      duplicateTree,
      renameTree: rename,
      deleteTree,
      getTree,
      shares,
      closeShared,
    }),
    [
      index,
      activeId,
      activeTree,
      editorKey,
      status,
      shared,
      openTree,
      updateTree,
      createTree,
      duplicateTree,
      rename,
      deleteTree,
      getTree,
      shares,
      closeShared,
    ],
  )

  return <TreesContext.Provider value={value}>{children}</TreesContext.Provider>
}

export default TreesProvider
