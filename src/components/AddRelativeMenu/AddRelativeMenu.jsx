import { RELATION_OPTIONS, RELATIONS } from '../../utils/relatives.js'
import './AddRelativeMenu.css'

function AddRelativeMenu({ canAddParent, onSelect }) {
  return (
    <div className="add-relative-menu" role="menu">
      <div className="add-relative-menu__title">Add relative</div>
      {RELATION_OPTIONS.map(({ value, label }) => {
        const disabled = value === RELATIONS.PARENT && !canAddParent
        return (
          <button
            key={value}
            type="button"
            role="menuitem"
            className="add-relative-menu__item"
            disabled={disabled}
            title={disabled ? 'Already has two parents' : undefined}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(value)
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default AddRelativeMenu
