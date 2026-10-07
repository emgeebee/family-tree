import { isValidTree } from '../utils/familyModel.js'

export function downloadTree(tree) {
  const json = JSON.stringify(tree, null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${tree.tree.slug || 'family-tree'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function readTreeFile(file) {
  const tree = JSON.parse(await file.text())
  if (!isValidTree(tree)) {
    throw new Error('This file is not a valid family tree export.')
  }
  return tree
}
