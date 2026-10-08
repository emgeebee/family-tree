import { useEffect, useMemo, useReducer, useRef } from 'react'
import { loadView, saveView } from '../services/storage.js'
import { getFamilyIndex } from '../utils/familyModel.js'
import { SPARE_IDS_NEEDED, timestamp } from '../utils/relatives.js'
import { FamilyTreeContext } from './familyTreeContext.js'
import { familyTreeReducer } from './familyTreeReducer.js'

const createId = () => crypto.randomUUID()

function initState({ treeId, initialTree }) {
  return familyTreeReducer(undefined, {
    type: 'load',
    payload: { tree: initialTree, focusId: loadView(treeId).focusId },
  })
}

/**
 * Editing state for one tree. Remount (via `key`) to load a different tree;
 * edits are reported through `onChange`. `readOnly` disables all edits.
 */
function FamilyTreeProvider({ treeId, initialTree, readOnly = false, onChange, children }) {
  const [state, dispatch] = useReducer(familyTreeReducer, { treeId, initialTree }, initState)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (state.tree !== initialTree) onChangeRef.current?.(state.tree)
  }, [state.tree, initialTree])

  useEffect(() => {
    saveView(treeId, { focusId: state.focusId })
  }, [treeId, state.focusId])

  const actions = useMemo(() => {
    const send = (type, payload) => dispatch({ type, payload: { ...payload, now: timestamp() } })
    const edit = (fn) => (readOnly ? () => {} : fn)
    return {
      addRelative: edit(({ anchorId, relation, fields, otherParentId }) => {
        const personId = createId()
        send('addRelative', {
          anchorId,
          relation,
          fields,
          otherParentId,
          personId,
          spareIds: Array.from({ length: SPARE_IDS_NEEDED }, createId),
        })
        return personId
      }),
      updatePerson: edit((id, fields) => send('updatePerson', { id, fields })),
      deletePerson: edit((id) => send('deletePerson', { id })),
      addPhotos: edit((id, urls) => send('addPhotos', { id, urls })),
      removePhoto: edit((id, url) => send('removePhoto', { id, url })),
      setProfilePhoto: edit((id, url) => send('setProfilePhoto', { id, url })),
      setPartnershipStatus: edit((id, status) => send('setPartnershipStatus', { id, status })),
      updatePartnership: edit((id, fields) => send('updatePartnership', { id, fields })),
      removePartnership: edit((id) => send('removePartnership', { id })),
      select: (id) => send('select', { id }),
      setFocus: (id) => send('setFocus', { id }),
    }
  }, [readOnly])

  const value = useMemo(
    () => ({ state, family: getFamilyIndex(state.tree), actions, readOnly }),
    [state, actions, readOnly],
  )

  return (
    <FamilyTreeContext.Provider value={value}>{children}</FamilyTreeContext.Provider>
  )
}

export default FamilyTreeProvider
