import { useContext } from 'react'
import { FamilyTreeContext } from '../context/familyTreeContext.js'

export function useFamilyTree() {
  const context = useContext(FamilyTreeContext)
  if (!context) {
    throw new Error('useFamilyTree must be used inside a FamilyTreeProvider')
  }
  return context
}
