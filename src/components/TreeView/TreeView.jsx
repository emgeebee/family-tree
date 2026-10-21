import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFamilyTree } from '../../hooks/useFamilyTree.js'
import { getPartnerId, getPartnerships, PARTNERSHIP_STATUS } from '../../utils/familyModel.js'
import { fullName, isDeceased, lifespan } from '../../utils/format.js'
import {
  parentCandidates,
  relationLabel,
  RELATIONS,
  secondParentCandidates,
} from '../../utils/relatives.js'
import { computeLayout } from '../../utils/treeLayout.js'
import Modal from '../Modal/Modal.jsx'
import ParentsFormModal from '../ParentsFormModal/ParentsFormModal.jsx'
import PartnershipFormModal from '../PartnershipFormModal/PartnershipFormModal.jsx'
import PersonFormModal from '../PersonFormModal/PersonFormModal.jsx'
import PersonPanel from '../PersonPanel/PersonPanel.jsx'
import TreeCanvas from '../TreeCanvas/TreeCanvas.jsx'
import './TreeView.css'

function buildAddModalProps(family, anchorId, relation) {
  const anchor = family.people[anchorId]
  const inheritsSurname = relation === RELATIONS.SIBLING || relation === RELATIONS.CHILD
  const props = {
    title: `Add ${relationLabel(relation).toLowerCase()} of ${fullName(anchor, family.settings)}`,
    submitLabel: 'Add',
    initialValues: { surname: inheritsSurname ? anchor.surname : '' },
  }

  if (relation === RELATIONS.CHILD) {
    const partnerships = getPartnerships(family, anchorId)
    props.otherParentOptions = partnerships.map((p) => {
      const partner = family.people[getPartnerId(p, anchorId)]
      const suffix = p.status === PARTNERSHIP_STATUS.EX ? ' (ex)' : ''
      return { id: partner.id, label: fullName(partner, family.settings) + suffix }
    })
    const current = partnerships.find((p) => p.status === PARTNERSHIP_STATUS.CURRENT)
    props.initialOtherParentId = current ? getPartnerId(current, anchorId) : ''
  }

  if (relation === RELATIONS.PARENT) {
    const parent = family.people[anchor.parentIds[0]]
    props.existingPersonOptions = secondParentCandidates(family, anchorId).map(({ id, status }) => {
      const role = status === PARTNERSHIP_STATUS.EX ? 'ex-partner' : 'partner'
      return {
        id,
        label: `${fullName(family.people[id], family.settings)} (${role} of ${fullName(parent, family.settings)})`,
      }
    })
  }

  return props
}

function parentOptions(family, childId) {
  return parentCandidates(family, childId)
    .map((p) => {
      const dates = lifespan(p)
      return { id: p.id, label: fullName(p, family.settings) + (dates ? ` (${dates})` : '') }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

function MarriageDetails({ partnership }) {
  const rows = [
    ['Married', partnership.marriageDate],
    ['Where', partnership.marriageLocation],
    ['Divorced', partnership.divorceDate],
  ].filter(([, value]) => value)
  return (
    <dl className="modal__details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The tree canvas, side panel and their dialogs for the tree in FamilyTreeProvider. */
function TreeView({ onStats }) {
  const { state, family, actions, readOnly } = useFamilyTree()
  const { focusId, selectedId } = state
  const [modal, setModal] = useState(null)
  const [onScreen, setOnScreen] = useState(null)
  const onStatsRef = useRef(onStats)

  const layout = useMemo(() => computeLayout(family, focusId), [family, focusId])
  const handleScreenCount = useCallback((count) => {
    setOnScreen((current) => (current === count ? current : count))
  }, [])

  const stats = useMemo(() => {
    const people = Object.values(family.people)
    return {
      total: people.length,
      shown: layout.nodes.length,
      generations: new Set(layout.nodes.map((node) => node.y)).size,
      living: people.filter((person) => !isDeceased(person)).length,
      onScreen,
    }
  }, [family, layout, onScreen])

  useLayoutEffect(() => {
    onStatsRef.current = onStats
  })

  useLayoutEffect(() => {
    onStatsRef.current?.(stats)
  }, [stats])

  useLayoutEffect(() => () => onStatsRef.current?.(null), [])

  const openAddModal = useCallback(
    (anchorId, relation) => setModal({ mode: 'add', anchorId, relation }),
    [],
  )
  const closeModal = useCallback(() => setModal(null), [])

  let modalProps = null
  if (!readOnly && modal?.mode === 'add' && family.people[modal.anchorId]) {
    modalProps = {
      ...buildAddModalProps(family, modal.anchorId, modal.relation),
      onSubmit: (fields, { otherParentId, existingId }) => {
        if (existingId) {
          actions.setParents(modal.anchorId, [...family.people[modal.anchorId].parentIds, existingId])
          closeModal()
          return
        }
        actions.addRelative({
          anchorId: modal.anchorId,
          relation: modal.relation,
          fields,
          otherParentId,
        })
        closeModal()
      },
    }
  } else if (!readOnly && modal?.mode === 'edit' && family.people[modal.personId]) {
    const person = family.people[modal.personId]
    modalProps = {
      title: `Edit ${fullName(person, family.settings)}`,
      initialValues: person,
      onSubmit: (fields) => {
        actions.updatePerson(person.id, fields)
        closeModal()
      },
    }
  }

  const modalPartnership = family.partnerships.find((p) => p.id === modal?.partnershipId)
  const editedPartnership =
    !readOnly && modal?.mode === 'editPartnership' ? modalPartnership : null
  const viewedPartnership = modal?.mode === 'viewPartnership' ? modalPartnership : null
  const coupleName = (partnership) =>
    partnership.partnerIds.map((id) => fullName(family.people[id], family.settings)).join(' & ')
  const notesPerson = modal?.mode === 'notes' ? family.people[modal.personId] : null
  const parentsPerson =
    !readOnly && modal?.mode === 'editParents' ? family.people[modal.personId] : null

  return (
    <>
      <div className="tree-view">
        <TreeCanvas
          family={family}
          layout={layout}
          focusId={focusId}
          selectedId={selectedId}
          readOnly={readOnly}
          onSelect={actions.select}
          onFocus={actions.setFocus}
          onAddRelative={openAddModal}
          onShowNotes={(personId) => setModal({ mode: 'notes', personId })}
          onShowPartnership={(partnershipId) =>
            setModal({ mode: 'viewPartnership', partnershipId })
          }
          onScreenChange={handleScreenCount}
        />
        {selectedId && (
          <PersonPanel
            personId={selectedId}
            onEdit={() => setModal({ mode: 'edit', personId: selectedId })}
            onEditPartnership={(partnershipId) =>
              setModal({ mode: 'editPartnership', partnershipId })
            }
            onEditParents={() => setModal({ mode: 'editParents', personId: selectedId })}
            onAddRelative={openAddModal}
          />
        )}
      </div>

      {parentsPerson && (
        <ParentsFormModal
          key={parentsPerson.id}
          title={`Parents of ${fullName(parentsPerson, family.settings)}`}
          options={parentOptions(family, parentsPerson.id)}
          initialParentIds={parentsPerson.parentIds}
          onSubmit={(parentIds) => {
            actions.setParents(parentsPerson.id, parentIds)
            closeModal()
          }}
          onCancel={closeModal}
        />
      )}

      {modalProps && (
        <PersonFormModal
          key={modal.mode + (modal.anchorId ?? modal.personId) + (modal.relation ?? '')}
          {...modalProps}
          onCancel={closeModal}
        />
      )}

      {notesPerson && (
        <Modal title={`Notes: ${fullName(notesPerson, family.settings)}`} onCancel={closeModal}>
          <p className="modal__text">{notesPerson.notes}</p>
        </Modal>
      )}

      {viewedPartnership && (
        <Modal
          title={coupleName(viewedPartnership)}
          submitLabel="Edit"
          cancelLabel="Close"
          onSubmit={
            readOnly
              ? undefined
              : () => setModal({ mode: 'editPartnership', partnershipId: viewedPartnership.id })
          }
          onCancel={closeModal}
        >
          <MarriageDetails partnership={viewedPartnership} />
        </Modal>
      )}

      {editedPartnership && (
        <PartnershipFormModal
          key={editedPartnership.id}
          title={`Wedding details: ${coupleName(editedPartnership)}`}
          partnership={editedPartnership}
          onSubmit={(fields) => {
            actions.updatePartnership(editedPartnership.id, fields)
            closeModal()
          }}
          onCancel={closeModal}
        />
      )}
    </>
  )
}

export default TreeView
