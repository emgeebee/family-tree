import { isValidTree } from '../utils/familyModel.js'

const PREFIX = 'family-tree'
const VIEW_KEY = `${PREFIX}:view`
const AUTH_KEY = `${PREFIX}:auth`
/** Single-tree storage used before trees were stored per user on the server. */
const LEGACY_TREE_KEY = `${PREFIX}:tree`

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be full or disabled; the app keeps working in memory.
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing to remove if storage is unavailable.
  }
}

/**
 * Browser cache of one user's trees, namespaced by their Google user id so
 * accounts sharing a browser never see (or upload) each other's trees.
 *
 *   index      [{ id, name, updatedAt }]
 *   tree:<id>  { tree, pending, version }  pending = not yet saved to the server
 *   active     id of the open tree
 */
export function createTreeCache(userId) {
  const base = `${PREFIX}:user:${userId}`
  const treeKey = (id) => `${base}:tree:${id}`

  return {
    loadIndex: () => read(`${base}:index`) ?? [],
    saveIndex: (index) => write(`${base}:index`, index),
    loadActiveId: () => read(`${base}:active`),
    saveActiveId: (id) => (id ? write(`${base}:active`, id) : remove(`${base}:active`)),
    loadTree(id) {
      const entry = read(treeKey(id))
      return entry && isValidTree(entry.tree) ? entry : null
    },
    saveTree: (id, entry) => write(treeKey(id), entry),
    removeTree: (id) => remove(treeKey(id)),
  }
}

export function loadLegacyTree() {
  const tree = read(LEGACY_TREE_KEY)
  return isValidTree(tree) ? tree : null
}

export function clearLegacyTree() {
  remove(LEGACY_TREE_KEY)
}

export function loadView(treeId) {
  return read(VIEW_KEY)?.[treeId] ?? {}
}

export function saveView(treeId, view) {
  const views = read(VIEW_KEY)
  write(VIEW_KEY, { ...(views && !('focusId' in views) ? views : {}), [treeId]: view })
}

export function loadAuthToken() {
  const token = read(AUTH_KEY)
  return typeof token === 'string' ? token : null
}

export function saveAuthToken(token) {
  write(AUTH_KEY, token)
}

export function clearAuthToken() {
  remove(AUTH_KEY)
}
