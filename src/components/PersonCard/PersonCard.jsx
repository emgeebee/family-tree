import { birthSurname, fullName, isDeceased, lifespan } from '../../utils/format.js'
import { canAddParent } from '../../utils/relatives.js'
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/treeLayout.js'
import AddRelativeMenu from '../AddRelativeMenu/AddRelativeMenu.jsx'
import Avatar from '../Avatar/Avatar.jsx'
import './PersonCard.css'

function PersonCard({
  person,
  settings,
  x,
  y,
  isSelected,
  isFocus,
  isMenuOpen,
  hiddenRelativeId,
  onSelect,
  onToggleMenu,
  onAddRelative,
  onRevealRelatives,
  onShowNotes,
}) {
  const classes = ['person-card']
  if (isSelected) classes.push('person-card--selected')
  if (isDeceased(person)) classes.push('person-card--deceased')

  return (
    <div
      className={classes.join(' ')}
      style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
      data-no-pan
      onClick={(e) => {
        e.stopPropagation()
        onSelect(person.id)
      }}
    >
      {hiddenRelativeId && (
        <button
          type="button"
          className="person-card__reveal"
          title="Show hidden relatives"
          onClick={(e) => {
            e.stopPropagation()
            onRevealRelatives(hiddenRelativeId)
          }}
        >
          ↑
        </button>
      )}

      <Avatar src={person.profile_image} />
      <div className="person-card__name">{fullName(person, settings)}</div>
      {birthSurname(person) && (
        <div className="person-card__birth-name">({birthSurname(person)})</div>
      )}
      <div className="person-card__dates">{lifespan(person)}</div>
      {isFocus && <span className="person-card__badge">Focus person</span>}

      {person.notes?.trim() && (
        <button
          type="button"
          className="person-card__notes"
          title="View notes"
          aria-label="View notes"
          onClick={(e) => {
            e.stopPropagation()
            onShowNotes(person.id)
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 1.5h7l3 3v10H3z" />
            <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" />
          </svg>
        </button>
      )}

      {isSelected && (
        <button
          type="button"
          className="person-card__add"
          aria-label="Add relative"
          aria-expanded={isMenuOpen}
          onClick={(e) => {
            e.stopPropagation()
            onToggleMenu(person.id)
          }}
        >
          +
        </button>
      )}

      {isSelected && isMenuOpen && (
        <AddRelativeMenu
          canAddParent={canAddParent(person)}
          onSelect={(relation) => onAddRelative(person.id, relation)}
        />
      )}
    </div>
  )
}

export default PersonCard
