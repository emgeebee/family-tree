import { useEffect, useRef, useState } from 'react'
import { usePanZoom } from '../../hooks/usePanZoom.js'
import { getPartnerships, getPartnerId } from '../../utils/familyModel.js'
import { hasMarriageDetails, marriageTooltip } from '../../utils/format.js'
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/treeLayout.js'
import PersonCard from '../PersonCard/PersonCard.jsx'
import './TreeCanvas.css'

function findHiddenRelativeId(family, person, visibleIds, focusId) {
  const hiddenParent = person.parentIds.find((id) => family.people[id] && !visibleIds.has(id))
  if (hiddenParent) return hiddenParent
  if (person.id === focusId) return null
  const hasHiddenPartner = getPartnerships(family, person.id).some(
    (p) => !visibleIds.has(getPartnerId(p, person.id)),
  )
  const hasHiddenChild = Object.values(family.people).some(
    (p) => p.parentIds.includes(person.id) && !visibleIds.has(p.id),
  )
  return hasHiddenPartner || hasHiddenChild ? person.id : null
}

function TreeCanvas({
  family,
  layout,
  focusId,
  selectedId,
  onSelect,
  onFocus,
  onAddRelative,
  onShowNotes,
  onShowPartnership,
}) {
  const partnershipsById = new Map(family.partnerships.map((p) => [p.id, p]))
  const { containerRef, view, zoomBy, centerOn, wasDragged, panHandlers } = usePanZoom()
  const [menuPersonId, setMenuPersonId] = useState(null)
  const centeredFocusRef = useRef(null)

  const centerOnPerson = (id) => {
    const node = layout.nodes.find((n) => n.id === id)
    if (node) centerOn(node.x + CARD_WIDTH / 2, node.y + CARD_HEIGHT / 2)
  }

  useEffect(() => {
    if (centeredFocusRef.current === focusId) return
    const node = layout.nodes.find((n) => n.id === focusId)
    if (!node) return
    centeredFocusRef.current = focusId
    centerOn(node.x + CARD_WIDTH / 2, node.y + CARD_HEIGHT / 2)
  }, [focusId, layout, centerOn])

  const handleSelect = (id) => {
    setMenuPersonId(null)
    onSelect(id)
  }

  const handleBackgroundClick = () => {
    if (wasDragged()) return
    setMenuPersonId(null)
    onSelect(null)
  }

  return (
    <div
      ref={containerRef}
      className="tree-canvas"
      onClick={handleBackgroundClick}
      {...panHandlers}
    >
      <div
        className="tree-canvas__content"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        <svg
          className="tree-canvas__lines"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {layout.lines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              strokeDasharray={line.dashed ? '6 4' : undefined}
            />
          ))}
        </svg>

        {layout.unions.map(({ partnershipId, x, y }) => {
          const partnership = partnershipsById.get(partnershipId)
          if (!partnership || !hasMarriageDetails(partnership)) return null
          return (
            <button
              key={partnershipId}
              type="button"
              className="tree-canvas__marriage"
              style={{ left: x, top: y }}
              title={marriageTooltip(partnership)}
              aria-label={`${marriageTooltip(partnership)} – show details`}
              data-no-pan
              onClick={(e) => {
                e.stopPropagation()
                onShowPartnership(partnershipId)
              }}
            >
              <svg viewBox="0 0 20 14" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" />
                <circle cx="13" cy="7" r="4.5" />
              </svg>
            </button>
          )
        })}

        {layout.nodes.map((node) => {
          const person = family.people[node.id]
          return (
            <PersonCard
              key={node.id}
              person={person}
              settings={family.settings}
              x={node.x}
              y={node.y}
              isSelected={node.id === selectedId}
              isFocus={node.id === focusId}
              isMenuOpen={node.id === menuPersonId}
              hiddenRelativeId={findHiddenRelativeId(family, person, layout.visibleIds, focusId)}
              onSelect={handleSelect}
              onToggleMenu={(id) => setMenuPersonId((current) => (current === id ? null : id))}
              onAddRelative={(id, relation) => {
                setMenuPersonId(null)
                onAddRelative(id, relation)
              }}
              onRevealRelatives={onFocus}
              onShowNotes={onShowNotes}
            />
          )
        })}
      </div>

      <div className="tree-canvas__controls" data-no-pan onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => centerOnPerson(selectedId ?? focusId)}>
          Center
        </button>
      </div>

      <div className="tree-canvas__hint">
        Drag or scroll to pan · Pinch or ⌘/Ctrl + scroll to zoom
      </div>
    </div>
  )
}

export default TreeCanvas
