import { defaultFocusId, getFamilyIndex } from '../utils/familyModel.js'
import {
  addPhotos,
  addRelative,
  closestRelativeId,
  deletePerson,
  removePartnership,
  removePhoto,
  setPartnershipStatus,
  setProfilePhoto,
  updatePartnership,
  updatePerson,
} from '../utils/relatives.js'
import { revealFocus } from '../utils/treeLayout.js'

export function familyTreeReducer(state, action) {
  const { payload } = action

  switch (action.type) {
    case 'addRelative': {
      const tree = addRelative(state.tree, payload)
      if (tree === state.tree) return state
      return {
        ...state,
        tree,
        selectedId: payload.personId,
        focusId: revealFocus(getFamilyIndex(tree), state.focusId, payload.personId, [
          payload.anchorId,
        ]),
      }
    }

    case 'updatePerson':
      return { ...state, tree: updatePerson(state.tree, payload.id, payload.fields, payload.now) }

    case 'addPhotos':
      return { ...state, tree: addPhotos(state.tree, payload.id, payload.urls, payload.now) }

    case 'removePhoto':
      return { ...state, tree: removePhoto(state.tree, payload.id, payload.url, payload.now) }

    case 'setProfilePhoto':
      return { ...state, tree: setProfilePhoto(state.tree, payload.id, payload.url, payload.now) }

    case 'deletePerson': {
      if (state.tree.individuals.length <= 1) return state
      const fallbackId = closestRelativeId(getFamilyIndex(state.tree), payload.id)
      const tree = deletePerson(state.tree, payload.id, payload.now)
      return {
        ...state,
        tree,
        focusId:
          state.focusId === payload.id ? (fallbackId ?? defaultFocusId(tree)) : state.focusId,
        selectedId: state.selectedId === payload.id ? null : state.selectedId,
      }
    }

    case 'setPartnershipStatus':
      return {
        ...state,
        tree: setPartnershipStatus(state.tree, payload.id, payload.status, payload.now),
      }

    case 'updatePartnership':
      return {
        ...state,
        tree: updatePartnership(state.tree, payload.id, payload.fields, payload.now),
      }

    case 'removePartnership':
      return { ...state, tree: removePartnership(state.tree, payload.id, payload.now) }

    case 'select': {
      const family = getFamilyIndex(state.tree)
      if (!payload.id || !family.people[payload.id]) return { ...state, selectedId: null }
      return {
        ...state,
        selectedId: payload.id,
        focusId: revealFocus(family, state.focusId, payload.id),
      }
    }

    case 'setFocus':
      if (!getFamilyIndex(state.tree).people[payload.id]) return state
      return { ...state, focusId: payload.id }

    case 'load': {
      const { tree, focusId } = payload
      const isKnown = tree.individuals.some((i) => i.id === focusId)
      return {
        tree,
        focusId: isKnown ? focusId : defaultFocusId(tree),
        selectedId: null,
      }
    }

    default:
      return state
  }
}
