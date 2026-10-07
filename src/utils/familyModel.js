import { dateSortKey } from './dates.js'

export const PARTNERSHIP_STATUS = {
  CURRENT: 'current',
  EX: 'ex',
}

export const PARTNER_TYPE_BY_STATUS = {
  [PARTNERSHIP_STATUS.CURRENT]: 'Current',
  [PARTNERSHIP_STATUS.EX]: 'Ex',
}

/** `individual_ids` is stored as a JSON-encoded string in the tree format. */
export function parseIndividualIds(partnerRelationship) {
  try {
    const ids = JSON.parse(partnerRelationship.individual_ids)
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

function buildFamilyIndex(tree) {
  const membersByRelationship = new Map(
    tree.partner_relationships.map((r) => [r.id, parseIndividualIds(r)]),
  )
  const individualIds = new Set(tree.individuals.map((i) => i.id))

  const parentIdsByChild = new Map()
  for (const link of tree.parent_relationships) {
    const parentIds = parentIdsByChild.get(link.child_id) ?? []
    for (const id of membersByRelationship.get(link.partner_relationship_id) ?? []) {
      if (id !== link.child_id && individualIds.has(id) && !parentIds.includes(id)) {
        parentIds.push(id)
      }
    }
    parentIdsByChild.set(link.child_id, parentIds)
  }

  const people = {}
  for (const individual of tree.individuals) {
    people[individual.id] = {
      ...individual,
      parentIds: parentIdsByChild.get(individual.id) ?? [],
    }
  }

  const partnerships = tree.partner_relationships
    .map((r) => ({
      id: r.id,
      partnerIds: membersByRelationship.get(r.id).filter((id) => individualIds.has(id)),
      status: r.type === 'Ex' ? PARTNERSHIP_STATUS.EX : PARTNERSHIP_STATUS.CURRENT,
      marriageDate: r.marriage_date,
      marriageLocation: r.marriage_location,
      divorceDate: r.divorcing_date,
    }))
    .filter((p) => p.partnerIds.length === 2)

  const childCountByRelationship = new Map()
  for (const link of tree.parent_relationships) {
    const id = link.partner_relationship_id
    childCountByRelationship.set(id, (childCountByRelationship.get(id) ?? 0) + 1)
  }

  return {
    name: tree.tree.name,
    settings: {
      showKnownAs: Boolean(tree.tree.show_known_as),
      reverseNames: Boolean(tree.tree.reverse_names),
    },
    people,
    partnerships,
    childCountByRelationship,
  }
}

const indexCache = new WeakMap()

/**
 * A read-only view of the raw tree that is easier to query: people keyed by id
 * with their `parentIds` resolved, and two-person partnerships.
 */
export function getFamilyIndex(tree) {
  let index = indexCache.get(tree)
  if (!index) {
    index = buildFamilyIndex(tree)
    indexCache.set(tree, index)
  }
  return index
}

export function getParents(family, id) {
  return (family.people[id]?.parentIds ?? []).map((pid) => family.people[pid])
}

export function getChildren(family, id) {
  return sortByBirth(
    Object.values(family.people).filter((p) => p.parentIds.includes(id)),
  )
}

export function getSiblings(family, id) {
  const parentIds = family.people[id]?.parentIds ?? []
  if (!parentIds.length) return []
  return sortByBirth(
    Object.values(family.people).filter(
      (p) => p.id !== id && p.parentIds.some((pid) => parentIds.includes(pid)),
    ),
  )
}

export function getPartnerships(family, id) {
  return family.partnerships.filter((p) => p.partnerIds.includes(id))
}

export function getPartnerId(partnership, id) {
  return partnership.partnerIds.find((pid) => pid !== id)
}

export function partnershipHasChildren(family, partnershipId) {
  return (family.childCountByRelationship.get(partnershipId) ?? 0) > 0
}

export function sortByBirth(people) {
  return [...people].sort(
    (a, b) =>
      (dateSortKey(a.date_of_birth) ?? Infinity) - (dateSortKey(b.date_of_birth) ?? Infinity),
  )
}

export function defaultFocusId(tree) {
  const own = tree.individuals.find((i) => i.user_id && i.user_id === tree.tree.user_id)
  const root = tree.individuals.find((i) => i.id === tree.tree.root_id)
  return (own ?? root ?? tree.individuals[0])?.id ?? null
}

export function isValidTree(tree) {
  return Boolean(
    tree &&
      typeof tree.tree === 'object' &&
      tree.tree !== null &&
      Array.isArray(tree.individuals) &&
      Array.isArray(tree.parent_relationships) &&
      Array.isArray(tree.partner_relationships) &&
      tree.individuals.every((i) => i && typeof i.id === 'string'),
  )
}
