import { isValidTree } from '../utils/familyModel.js'

const TREE_KEY = 'family-tree:tree'
const VIEW_KEY = 'family-tree:view'

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

export function loadTree() {
  const tree = read(TREE_KEY)
  return isValidTree(tree) ? tree : null
}

export function saveTree(tree) {
  write(TREE_KEY, tree)
}

export function loadView() {
  return read(VIEW_KEY) ?? {}
}

export function saveView(view) {
  write(VIEW_KEY, view)
}
