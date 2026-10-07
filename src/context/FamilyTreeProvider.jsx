import { useEffect, useMemo, useReducer, useState } from 'react'
import sampleTree from '../data/sampleTree.json'
import { useServerBackup } from '../hooks/useServerBackup.js'
import { loadTree, loadView, saveTree, saveView } from '../services/storage.js'
import { getFamilyIndex } from '../utils/familyModel.js'
import { SPARE_IDS_NEEDED, timestamp } from '../utils/relatives.js'
import { FamilyTreeContext } from './familyTreeContext.js'
import { familyTreeReducer } from './familyTreeReducer.js'

function initState(storedTree) {
  return familyTreeReducer(undefined, {
    type: 'load',
    payload: { tree: storedTree ?? sampleTree, focusId: loadView().focusId },
  })
}

const createId = () => crypto.randomUUID()

function FamilyTreeProvider({ children }) {
  const [storedTree] = useState(loadTree)
  const [state, dispatch] = useReducer(familyTreeReducer, storedTree, initState)

  useEffect(() => {
    saveTree(state.tree)
  }, [state.tree])

  useEffect(() => {
    saveView({ focusId: state.focusId })
  }, [state.focusId])

  const actions = useMemo(() => {
    const send = (type, payload) => dispatch({ type, payload: { ...payload, now: timestamp() } })
    return {
      addRelative: ({ anchorId, relation, fields, otherParentId }) => {
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
      },
      updatePerson: (id, fields) => send('updatePerson', { id, fields }),
      deletePerson: (id) => send('deletePerson', { id }),
      addPhotos: (id, urls) => send('addPhotos', { id, urls }),
      removePhoto: (id, url) => send('removePhoto', { id, url }),
      setProfilePhoto: (id, url) => send('setProfilePhoto', { id, url }),
      setPartnershipStatus: (id, status) => send('setPartnershipStatus', { id, status }),
      updatePartnership: (id, fields) => send('updatePartnership', { id, fields }),
      removePartnership: (id) => send('removePartnership', { id }),
      select: (id) => send('select', { id }),
      setFocus: (id) => send('setFocus', { id }),
      load: (tree) => send('load', { tree }),
      resetToSample: () => send('load', { tree: sampleTree }),
    }
  }, [])

  const backupStatus = useServerBackup(state.tree, {
    hasLocalTree: storedTree !== null,
    onRestore: actions.load,
  })

  const value = useMemo(
    () => ({ state, family: getFamilyIndex(state.tree), actions, backupStatus }),
    [state, actions, backupStatus],
  )

  return (
    <FamilyTreeContext.Provider value={value}>{children}</FamilyTreeContext.Provider>
  )
}

export default FamilyTreeProvider
