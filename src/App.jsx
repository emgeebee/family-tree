import { useCallback, useMemo, useState } from 'react'
import DataMenu from './components/DataMenu/DataMenu.jsx'
import Header from './components/Header/Header.jsx'
import Modal from './components/Modal/Modal.jsx'
import PartnershipFormModal from './components/PartnershipFormModal/PartnershipFormModal.jsx'
import PersonFormModal from './components/PersonFormModal/PersonFormModal.jsx'
import PersonPanel from './components/PersonPanel/PersonPanel.jsx'
import TreeCanvas from './components/TreeCanvas/TreeCanvas.jsx'
import UserMenu from './components/UserMenu/UserMenu.jsx'
import { useFamilyTree } from './hooks/useFamilyTree.js'
import { getPartnerId, getPartnerships, PARTNERSHIP_STATUS } from './utils/familyModel.js'
import { fullName } from './utils/format.js'
import { relationLabel, RELATIONS } from './utils/relatives.js'
import { computeLayout } from './utils/treeLayout.js'
import './App.css'

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

  return props
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

function App() {
  const { state, family, actions } = useFamilyTree()
  const { focusId, selectedId } = state
  const [modal, setModal] = useState(null)

  const layout = useMemo(() => computeLayout(family, focusId), [family, focusId])

  const openAddModal = useCallback(
    (anchorId, relation) => setModal({ mode: 'add', anchorId, relation }),
    [],
  )
  const closeModal = useCallback(() => setModal(null), [])

  let modalProps = null
  if (modal?.mode === 'add' && family.people[modal.anchorId]) {
    modalProps = {
      ...buildAddModalProps(family, modal.anchorId, modal.relation),
      onSubmit: (fields, { otherParentId }) => {
        actions.addRelative({
          anchorId: modal.anchorId,
          relation: modal.relation,
          fields,
          otherParentId,
        })
        closeModal()
      },
    }
  } else if (modal?.mode === 'edit' && family.people[modal.personId]) {
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
  const editedPartnership = modal?.mode === 'editPartnership' ? modalPartnership : null
  const viewedPartnership = modal?.mode === 'viewPartnership' ? modalPartnership : null
  const coupleName = (partnership) =>
    partnership.partnerIds.map((id) => fullName(family.people[id], family.settings)).join(' & ')
  const notesPerson = modal?.mode === 'notes' ? family.people[modal.personId] : null

  return (
    <>
      <Header title={family.name || 'Family Tree'}>
        <DataMenu />
        <UserMenu />
      </Header>

      <div className="app-body">
        <TreeCanvas
          family={family}
          layout={layout}
          focusId={focusId}
          selectedId={selectedId}
          onSelect={actions.select}
          onFocus={actions.setFocus}
          onAddRelative={openAddModal}
          onShowNotes={(personId) => setModal({ mode: 'notes', personId })}
          onShowPartnership={(partnershipId) =>
            setModal({ mode: 'viewPartnership', partnershipId })
          }
        />
        {selectedId && (
          <PersonPanel
            personId={selectedId}
            onEdit={() => setModal({ mode: 'edit', personId: selectedId })}
            onEditPartnership={(partnershipId) =>
              setModal({ mode: 'editPartnership', partnershipId })
            }
            onAddRelative={openAddModal}
          />
        )}
      </div>

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
          onSubmit={() => setModal({ mode: 'editPartnership', partnershipId: viewedPartnership.id })}
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

export default App
