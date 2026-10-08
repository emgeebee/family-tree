import { useContext } from 'react'
import { TreesContext } from '../context/treesContext.js'

export function useTrees() {
  const context = useContext(TreesContext)
  if (!context) throw new Error('useTrees must be used inside a TreesProvider')
  return context
}
