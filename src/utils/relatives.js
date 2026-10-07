import {
  getFamilyIndex,
  getPartnerships,
  parseIndividualIds,
  PARTNER_TYPE_BY_STATUS,
  PARTNERSHIP_STATUS,
} from './familyModel.js'

export const RELATIONS = {
  PARENT: 'parent',
  SIBLING: 'sibling',
  PARTNER: 'partner',
  EX_PARTNER: 'exPartner',
  CHILD: 'child',
}

export const RELATION_OPTIONS = [
  { value: RELATIONS.PARENT, label: 'Parent' },
  { value: RELATIONS.SIBLING, label: 'Sibling' },
  { value: RELATIONS.PARTNER, label: 'Partner' },
  { value: RELATIONS.EX_PARTNER, label: 'Ex-partner' },
  { value: RELATIONS.CHILD, label: 'Child' },
]

/** Number of fresh ids `addRelative` may need for a single operation. */
export const SPARE_IDS_NEEDED = 4

const PERSON_FIELDS = [
  'given_name',
  'surname',
  'surname_at_birth',
  'known_as',
  'gender',
  'date_of_birth',
  'date_of_death',
  'is_deceased',
  'place_of_birth',
  'place_of_death',
  'notes',
  'profile_image',
]

const PARTNERSHIP_FIELDS = ['marriage_date', 'marriage_location', 'divorcing_date']

export function relationLabel(relation) {
  return RELATION_OPTIONS.find((o) => o.value === relation)?.label ?? relation
}

export function canAddParent(person) {
  return person.parentIds.length < 2
}

/** Matches the API's timestamp format, e.g. 2026-09-27T19:13:37.000000Z */
export function timestamp(date = new Date()) {
  return date.toISOString().replace(/Z$/, '000Z')
}

function cleanFields(fields = {}, allowed = PERSON_FIELDS) {
  const out = {}
  for (const key of allowed) {
    if (!(key in fields)) continue
    const value = fields[key]
    out[key] = typeof value === 'string' ? value.trim() || null : value
  }
  return out
}

/**
 * `photos` ([{ url, created_at }]) extends the API's individual shape with a
 * gallery; `profile_image` is always one of them.
 */
function withProfileInGallery(person, now) {
  const photos = person.photos ?? []
  if (!person.profile_image || photos.some((p) => p.url === person.profile_image)) {
    return person
  }
  return { ...person, photos: [...photos, { url: person.profile_image, created_at: now }] }
}

function newIndividual(tree, id, fields, now) {
  return withProfileInGallery(newIndividualRecord(tree, id, fields, now), now)
}

function newIndividualRecord(tree, id, fields, now) {
  return {
    id,
    tree_id: tree.tree.id,
    given_name: null,
    surname: null,
    surname_at_birth: null,
    place_of_birth: null,
    place_of_death: null,
    gender: null,
    age: 0,
    date_of_birth: null,
    date_of_death: null,
    known_as: null,
    notes: null,
    created_at: now,
    updated_at: now,
    profile_image: null,
    user_id: null,
    is_deceased: false,
    user: null,
    photos: [],
    ...cleanFields(fields),
  }
}

function newPartnerRelationship(tree, id, individualIds, status, now) {
  return {
    id,
    tree_id: tree.tree.id,
    type: PARTNER_TYPE_BY_STATUS[status],
    individual_ids: JSON.stringify(individualIds),
    created_at: now,
    updated_at: now,
    relationship_type: null,
    location: null,
    marriage_date: null,
    marriage_location: null,
    separating_date: null,
    divorcing_date: null,
    start_relationship_date: null,
    other_relationship_info: null,
    other_relationship_start_date: null,
  }
}

function newParentRelationship(tree, id, childId, partnerRelationshipId, now) {
  return {
    id,
    tree_id: tree.tree.id,
    child_id: childId,
    partner_relationship_id: partnerRelationshipId,
    type: 'Biological',
    created_at: now,
    updated_at: now,
  }
}

function withChanges(tree, now, changes) {
  return { ...tree, ...changes, tree: { ...tree.tree, updated_at: now } }
}

function findUnion(tree, memberIds) {
  return tree.partner_relationships.find((r) => {
    const ids = parseIndividualIds(r)
    return ids.length === memberIds.length && memberIds.every((id) => ids.includes(id))
  })
}

/**
 * Returns a new tree with a person added relative to `anchorId`.
 * Children hang off a partner relationship (their parents' union), so a single
 * parent is a one-member partner relationship.
 */
export function addRelative(
  tree,
  { anchorId, relation, personId, spareIds, fields, otherParentId, now },
) {
  const family = getFamilyIndex(tree)
  const anchor = family.people[anchorId]
  if (!anchor) return tree

  const ids = [...spareIds]
  const nextId = () => ids.shift()
  const individuals = [...tree.individuals, newIndividual(tree, personId, fields, now)]
  const anchorLink = tree.parent_relationships.find((r) => r.child_id === anchorId)

  switch (relation) {
    case RELATIONS.PARENT: {
      if (!canAddParent(anchor)) return tree
      if (!anchorLink) {
        const unionId = nextId()
        return withChanges(tree, now, {
          individuals,
          partner_relationships: [
            ...tree.partner_relationships,
            newPartnerRelationship(tree, unionId, [personId], PARTNERSHIP_STATUS.CURRENT, now),
          ],
          parent_relationships: [
            ...tree.parent_relationships,
            newParentRelationship(tree, nextId(), anchorId, unionId, now),
          ],
        })
      }
      return withChanges(tree, now, {
        individuals,
        partner_relationships: tree.partner_relationships.map((r) =>
          r.id === anchorLink.partner_relationship_id
            ? {
                ...r,
                individual_ids: JSON.stringify([...parseIndividualIds(r), personId]),
                updated_at: now,
              }
            : r,
        ),
      })
    }

    case RELATIONS.SIBLING: {
      let partnerRelationships = tree.partner_relationships
      let parentRelationships = tree.parent_relationships
      let unionId = anchorLink?.partner_relationship_id
      if (!unionId) {
        const placeholderId = nextId()
        unionId = nextId()
        individuals.push(newIndividual(tree, placeholderId, { surname: anchor.surname }, now))
        partnerRelationships = [
          ...partnerRelationships,
          newPartnerRelationship(tree, unionId, [placeholderId], PARTNERSHIP_STATUS.CURRENT, now),
        ]
        parentRelationships = [
          ...parentRelationships,
          newParentRelationship(tree, nextId(), anchorId, unionId, now),
        ]
      }
      return withChanges(tree, now, {
        individuals,
        partner_relationships: partnerRelationships,
        parent_relationships: [
          ...parentRelationships,
          newParentRelationship(tree, nextId(), personId, unionId, now),
        ],
      })
    }

    case RELATIONS.PARTNER:
    case RELATIONS.EX_PARTNER: {
      const status =
        relation === RELATIONS.EX_PARTNER ? PARTNERSHIP_STATUS.EX : PARTNERSHIP_STATUS.CURRENT
      return withChanges(tree, now, {
        individuals,
        partner_relationships: [
          ...tree.partner_relationships,
          newPartnerRelationship(tree, nextId(), [anchorId, personId], status, now),
        ],
      })
    }

    case RELATIONS.CHILD: {
      const members =
        otherParentId && family.people[otherParentId] ? [anchorId, otherParentId] : [anchorId]
      let partnerRelationships = tree.partner_relationships
      let union = findUnion(tree, members)
      if (!union) {
        union = newPartnerRelationship(tree, nextId(), members, PARTNERSHIP_STATUS.CURRENT, now)
        partnerRelationships = [...partnerRelationships, union]
      }
      return withChanges(tree, now, {
        individuals,
        partner_relationships: partnerRelationships,
        parent_relationships: [
          ...tree.parent_relationships,
          newParentRelationship(tree, nextId(), personId, union.id, now),
        ],
      })
    }

    default:
      return tree
  }
}

function updateIndividual(tree, id, update, now) {
  return withChanges(tree, now, {
    individuals: tree.individuals.map((i) =>
      i.id === id ? withProfileInGallery({ ...update(i), updated_at: now }, now) : i,
    ),
  })
}

export function updatePerson(tree, id, fields, now) {
  return updateIndividual(tree, id, (i) => ({ ...i, ...cleanFields(fields) }), now)
}

export function addPhotos(tree, id, urls, now) {
  if (!urls.length) return tree
  return updateIndividual(
    tree,
    id,
    (i) => ({
      ...i,
      photos: [...(i.photos ?? []), ...urls.map((url) => ({ url, created_at: now }))],
      profile_image: i.profile_image ?? urls[0],
    }),
    now,
  )
}

export function removePhoto(tree, id, url, now) {
  return updateIndividual(
    tree,
    id,
    (i) => {
      const photos = (i.photos ?? []).filter((p) => p.url !== url)
      const profile_image = i.profile_image === url ? (photos[0]?.url ?? null) : i.profile_image
      return { ...i, photos, profile_image }
    },
    now,
  )
}

export function setProfilePhoto(tree, id, url, now) {
  return updateIndividual(tree, id, (i) => ({ ...i, profile_image: url }), now)
}

export function deletePerson(tree, id, now) {
  const parentRelationships = tree.parent_relationships.filter((r) => r.child_id !== id)
  const relationshipsWithChildren = new Set(
    parentRelationships.map((r) => r.partner_relationship_id),
  )

  const partnerRelationships = tree.partner_relationships.flatMap((r) => {
    const ids = parseIndividualIds(r)
    if (!ids.includes(id)) return [r]
    const remaining = ids.filter((x) => x !== id)
    if (remaining.length < 2 && !relationshipsWithChildren.has(r.id)) return []
    return [{ ...r, individual_ids: JSON.stringify(remaining), updated_at: now }]
  })
  const remainingRelationshipIds = new Set(partnerRelationships.map((r) => r.id))

  return withChanges(tree, now, {
    individuals: tree.individuals.filter((i) => i.id !== id),
    partner_relationships: partnerRelationships,
    parent_relationships: parentRelationships.filter((r) =>
      remainingRelationshipIds.has(r.partner_relationship_id),
    ),
  })
}

export function setPartnershipStatus(tree, partnerRelationshipId, status, now) {
  return withChanges(tree, now, {
    partner_relationships: tree.partner_relationships.map((r) =>
      r.id === partnerRelationshipId
        ? { ...r, type: PARTNER_TYPE_BY_STATUS[status], updated_at: now }
        : r,
    ),
  })
}

export function updatePartnership(tree, partnerRelationshipId, fields, now) {
  return withChanges(tree, now, {
    partner_relationships: tree.partner_relationships.map((r) =>
      r.id === partnerRelationshipId
        ? { ...r, ...cleanFields(fields, PARTNERSHIP_FIELDS), updated_at: now }
        : r,
    ),
  })
}

/** Partnerships with children can't be removed without orphaning them. */
export function removePartnership(tree, partnerRelationshipId, now) {
  if (tree.parent_relationships.some((r) => r.partner_relationship_id === partnerRelationshipId)) {
    return tree
  }
  return withChanges(tree, now, {
    partner_relationships: tree.partner_relationships.filter(
      (r) => r.id !== partnerRelationshipId,
    ),
  })
}

export function closestRelativeId(family, id) {
  const person = family.people[id]
  if (!person) return null
  const partner = getPartnerships(family, id)
    .flatMap((p) => p.partnerIds)
    .find((pid) => pid !== id)
  const child = Object.values(family.people).find((p) => p.parentIds.includes(id))
  return person.parentIds[0] ?? partner ?? child?.id ?? null
}
