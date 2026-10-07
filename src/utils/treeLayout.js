import {
  getChildren,
  getPartnerId,
  getPartnerships,
  PARTNERSHIP_STATUS,
} from './familyModel.js'

export const CARD_WIDTH = 130
export const CARD_HEIGHT = 170
export const PARTNER_LINE_OFFSET = 44

const PARTNER_GAP = 40
const SIBLING_GAP = 30
const GROUP_GAP = 50
const GENERATION_GAP = 90
const BAR_STAGGER = 10

/**
 * The tree is drawn as the descendants of a single root ancestor. The root is
 * found by walking up from the focus person, preferring the parent line with
 * the most generations above it.
 */
export function findRoot(family, focusId) {
  const depthCache = new Map()
  const depth = (id) => {
    if (depthCache.has(id)) return depthCache.get(id)
    depthCache.set(id, 0)
    const parentIds = (family.people[id]?.parentIds ?? []).filter((p) => family.people[p])
    const d = parentIds.length ? 1 + Math.max(...parentIds.map(depth)) : 0
    depthCache.set(id, d)
    return d
  }

  let current = focusId
  const visited = new Set()
  while (true) {
    visited.add(current)
    const parentIds = family.people[current].parentIds.filter(
      (p) => family.people[p] && !visited.has(p),
    )
    if (!parentIds.length) return current
    current = parentIds.reduce((best, p) => (depth(p) > depth(best) ? p : best))
  }
}

function buildUnit(family, personId, seen) {
  seen.add(personId)

  const partnerships = getPartnerships(family, personId).filter((p) => {
    const otherId = getPartnerId(p, personId)
    return family.people[otherId] && !seen.has(otherId)
  })
  const toMember = (p) => ({
    id: getPartnerId(p, personId),
    status: p.status,
    partnershipId: p.id,
  })
  const exes = partnerships.filter((p) => p.status === PARTNERSHIP_STATUS.EX).map(toMember)
  const currents = partnerships.filter((p) => p.status !== PARTNERSHIP_STATUS.EX).map(toMember)
  for (const m of [...exes, ...currents]) seen.add(m.id)

  const members = [...exes, { id: personId }, ...currents]
  const partnerIds = new Set([...exes, ...currents].map((m) => m.id))
  const children = getChildren(family, personId)

  const groupSpecs = [
    ...exes.map((m) => ({ partnerId: m.id })),
    { partnerId: null },
    ...currents.map((m) => ({ partnerId: m.id })),
  ]

  const groups = groupSpecs.map(({ partnerId }) => {
    const groupChildren = children.filter((c) => {
      const others = c.parentIds.filter((pid) => pid !== personId)
      return partnerId
        ? others.includes(partnerId)
        : !others.some((pid) => partnerIds.has(pid))
    })
    const units = groupChildren
      .filter((c) => !seen.has(c.id))
      .map((c) => buildUnit(family, c.id, seen))
    return { partnerId, units }
  }).filter((g) => g.units.length)

  const membersWidth = members.length * CARD_WIDTH + (members.length - 1) * PARTNER_GAP
  const groupWidths = groups.map(
    (g) =>
      g.units.reduce((sum, u) => sum + u.width, 0) + (g.units.length - 1) * SIBLING_GAP,
  )
  const childrenWidth = groups.length
    ? groupWidths.reduce((a, b) => a + b, 0) + (groups.length - 1) * GROUP_GAP
    : 0

  return {
    personId,
    members,
    groups,
    membersWidth,
    childrenWidth,
    width: Math.max(membersWidth, childrenWidth),
  }
}

function placeUnit(unit, left, top, out) {
  const membersLeft = left + (unit.width - unit.membersWidth) / 2
  const xs = new Map()
  unit.members.forEach((m, i) => {
    const x = membersLeft + i * (CARD_WIDTH + PARTNER_GAP)
    xs.set(m.id, x)
    out.nodes.push({ id: m.id, x, y: top })
  })

  const personX = xs.get(unit.personId)
  const lineY = top + PARTNER_LINE_OFFSET
  const unionPoints = new Map()

  for (const m of unit.members) {
    if (m.id === unit.personId) continue
    const px = xs.get(m.id)
    const isLeft = px < personX
    out.lines.push({
      x1: isLeft ? px + CARD_WIDTH : personX + CARD_WIDTH,
      y1: lineY,
      x2: isLeft ? personX : px,
      y2: lineY,
      dashed: m.status === PARTNERSHIP_STATUS.EX,
    })
    const union = {
      x: isLeft ? px + CARD_WIDTH + PARTNER_GAP / 2 : px - PARTNER_GAP / 2,
      y: lineY,
    }
    unionPoints.set(m.id, union)
    out.unions.push({ partnershipId: m.partnershipId, ...union })
  }

  let cursor = left + (unit.width - unit.childrenWidth) / 2
  const childTop = top + CARD_HEIGHT + GENERATION_GAP

  unit.groups.forEach((group, gi) => {
    const childCenters = group.units.map((childUnit) => {
      const childX = placeUnit(childUnit, cursor, childTop, out)
      cursor += childUnit.width + SIBLING_GAP
      return childX + CARD_WIDTH / 2
    })
    cursor += GROUP_GAP - SIBLING_GAP

    const origin = group.partnerId
      ? unionPoints.get(group.partnerId)
      : { x: personX + CARD_WIDTH / 2, y: top + CARD_HEIGHT }
    const barY =
      top + CARD_HEIGHT + GENERATION_GAP / 2 +
      (gi - (unit.groups.length - 1) / 2) * BAR_STAGGER

    out.lines.push({ x1: origin.x, y1: origin.y, x2: origin.x, y2: barY })
    out.lines.push({
      x1: Math.min(origin.x, ...childCenters),
      y1: barY,
      x2: Math.max(origin.x, ...childCenters),
      y2: barY,
    })
    for (const cx of childCenters) {
      out.lines.push({ x1: cx, y1: barY, x2: cx, y2: childTop })
    }
  })

  return personX
}

const EMPTY_LAYOUT = {
  nodes: [],
  lines: [],
  unions: [],
  width: 0,
  height: 0,
  rootId: null,
  visibleIds: new Set(),
}

export function computeLayout(family, focusId) {
  const effectiveFocus = family.people[focusId] ? focusId : Object.keys(family.people)[0]
  if (!effectiveFocus) return EMPTY_LAYOUT

  const rootId = findRoot(family, effectiveFocus)
  const unit = buildUnit(family, rootId, new Set())
  const out = { nodes: [], lines: [], unions: [] }
  placeUnit(unit, 0, 0, out)

  const width = Math.max(...out.nodes.map((n) => n.x + CARD_WIDTH))
  const height = Math.max(...out.nodes.map((n) => n.y + CARD_HEIGHT))
  return {
    ...out,
    width,
    height,
    rootId,
    visibleIds: new Set(out.nodes.map((n) => n.id)),
  }
}

/**
 * Picks a focus person that makes `targetId` visible: keeps the current focus
 * if possible, otherwise tries each candidate, and finally focuses the target.
 */
export function revealFocus(family, focusId, targetId, candidates = []) {
  const isVisibleWith = (f) =>
    family.people[f] && computeLayout(family, f).visibleIds.has(targetId)
  if (isVisibleWith(focusId)) return focusId
  return candidates.find(isVisibleWith) ?? targetId
}
