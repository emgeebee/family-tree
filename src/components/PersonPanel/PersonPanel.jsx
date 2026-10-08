import { useEffect, useRef, useState } from 'react'
import { config } from '../../config.js'
import { useFamilyTree } from '../../hooks/useFamilyTree.js'
import {
  getChildren,
  getParents,
  getPartnerId,
  getPartnerships,
  getSiblings,
  partnershipHasChildren,
  PARTNERSHIP_STATUS,
} from '../../utils/familyModel.js'
import { fullName, lifespan } from '../../utils/format.js'
import { canAddParent, RELATION_OPTIONS, RELATIONS } from '../../utils/relatives.js'
import Avatar from '../Avatar/Avatar.jsx'
import PhotoGallery from '../PhotoGallery/PhotoGallery.jsx'
import './PersonPanel.css'

function PersonLink({ person, settings, meta, onSelect, children }) {
  return (
    <li className="person-panel__relative">
      <button type="button" className="person-panel__link" onClick={() => onSelect(person.id)}>
        <Avatar src={person.profile_image} size={28} />
        <span>
          <span className="person-panel__relative-name">{fullName(person, settings)}</span>
          <span className="person-panel__relative-dates">{lifespan(person)}</span>
          {meta && <span className="person-panel__relative-meta">{meta}</span>}
        </span>
      </button>
      {children}
    </li>
  )
}

function RelativeSection({ title, people, settings, onSelect }) {
  if (!people.length) return null
  return (
    <section className="person-panel__section">
      <h3>{title}</h3>
      <ul>
        {people.map((p) => (
          <PersonLink key={p.id} person={p} settings={settings} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  )
}

function joinParts(...parts) {
  return parts.filter(Boolean).join(', ')
}

function partnershipSummary(partnership) {
  const parts = []
  if (partnership.marriageDate || partnership.marriageLocation) {
    parts.push(`Married ${joinParts(partnership.marriageDate, partnership.marriageLocation)}`)
  }
  if (partnership.divorceDate) parts.push(`divorced ${partnership.divorceDate}`)
  return parts.join(' · ')
}

function PersonDetails({ person }) {
  const details = [
    ['Born', joinParts(person.date_of_birth, person.place_of_birth)],
    ['Died', joinParts(person.date_of_death, person.place_of_death)],
    ['Surname at birth', person.surname_at_birth],
    ['Known as', person.known_as],
  ].filter(([, value]) => value)

  if (!details.length) return null
  return (
    <section className="person-panel__section">
      <h3>Details</h3>
      <dl className="person-panel__details">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const NOTES_AUTOSAVE_MS = 800

function PersonNotes({ notes, onSave }) {
  const [draft, setDraft] = useState(notes ?? '')
  const isDirty = draft !== (notes ?? '')
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  })

  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => onSaveRef.current(draft), NOTES_AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [draft, isDirty])

  return (
    <section className="person-panel__section">
      <h3>Notes</h3>
      <textarea
        className="person-panel__notes"
        rows={4}
        placeholder="Add notes about this person…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (isDirty) onSave(draft)
        }}
      />
    </section>
  )
}

function PersonPanel({ personId, onEdit, onEditPartnership, onAddRelative }) {
  const { state, family, actions } = useFamilyTree()
  const person = family.people[personId]
  if (!person) return null

  const { settings } = family
  const parents = getParents(family, personId)
  const children = getChildren(family, personId)
  const siblings = getSiblings(family, personId)
  const partnerships = getPartnerships(family, personId)
  const isOnlyPerson = state.tree.individuals.length <= 1

  const handleDelete = () => {
    const name = fullName(person, settings)
    if (window.confirm(`Delete ${name}? Their relationships will be removed too.`)) {
      actions.deletePerson(personId)
    }
  }

  return (
    <aside className="person-panel">
      <button
        type="button"
        className="person-panel__close"
        aria-label="Close"
        onClick={() => actions.select(null)}
      >
        ×
      </button>

      <div className="person-panel__header">
        <Avatar src={person.profile_image} size={88} />
        <h2>{fullName(person, settings)}</h2>
        {lifespan(person) && <p>{lifespan(person)}</p>}
      </div>

      <div className="person-panel__actions">
        <button type="button" className="button" onClick={onEdit}>Edit</button>
        <button
          type="button"
          className="button"
          disabled={personId === state.focusId}
          onClick={() => actions.setFocus(personId)}
        >
          Set as focus
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={isOnlyPerson}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      <PersonDetails person={person} />

      <PersonNotes
        key={personId}
        notes={person.notes}
        onSave={(notes) => actions.updatePerson(personId, { notes })}
      />

      {config.photoUploads && (
        <section className="person-panel__section">
          <h3>Photos{person.photos?.length ? ` (${person.photos.length})` : ''}</h3>
          <PhotoGallery
            key={personId}
            photos={person.photos ?? []}
            profileUrl={person.profile_image}
            onAdd={(urls) => actions.addPhotos(personId, urls)}
            onRemove={(url) => actions.removePhoto(personId, url)}
            onSetProfile={(url) => actions.setProfilePhoto(personId, url)}
          />
        </section>
      )}

      <section className="person-panel__section">
        <h3>Add relative</h3>
        <div className="person-panel__add">
          {RELATION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="button button--small"
              disabled={value === RELATIONS.PARENT && !canAddParent(person)}
              onClick={() => onAddRelative(personId, value)}
            >
              + {label}
            </button>
          ))}
        </div>
      </section>

      <RelativeSection
        title="Parents"
        people={parents}
        settings={settings}
        onSelect={actions.select}
      />

      {partnerships.length > 0 && (
        <section className="person-panel__section">
          <h3>Partners</h3>
          <ul>
            {partnerships.map((p) => {
              const partner = family.people[getPartnerId(p, personId)]
              const hasChildren = partnershipHasChildren(family, p.id)
              return (
                <PersonLink
                  key={p.id}
                  person={partner}
                  settings={settings}
                  meta={partnershipSummary(p)}
                  onSelect={actions.select}
                >
                  <div className="person-panel__partner-controls">
                    <select
                      value={p.status}
                      aria-label="Relationship status"
                      onChange={(e) => actions.setPartnershipStatus(p.id, e.target.value)}
                    >
                      <option value={PARTNERSHIP_STATUS.CURRENT}>Partner</option>
                      <option value={PARTNERSHIP_STATUS.EX}>Ex-partner</option>
                    </select>
                    <button
                      type="button"
                      className="person-panel__icon-button"
                      title="Wedding details"
                      aria-label="Edit wedding details"
                      onClick={() => onEditPartnership(p.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="person-panel__icon-button person-panel__icon-button--danger"
                      disabled={hasChildren}
                      title={
                        hasChildren
                          ? 'This couple has children, so the relationship cannot be removed'
                          : 'Remove relationship'
                      }
                      aria-label="Remove relationship"
                      onClick={() => actions.removePartnership(p.id)}
                    >
                      ×
                    </button>
                  </div>
                </PersonLink>
              )
            })}
          </ul>
        </section>
      )}

      <RelativeSection
        title="Children"
        people={children}
        settings={settings}
        onSelect={actions.select}
      />
      <RelativeSection
        title="Siblings"
        people={siblings}
        settings={settings}
        onSelect={actions.select}
      />
    </aside>
  )
}

export default PersonPanel
