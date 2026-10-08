import { timestamp } from './relatives.js'

const UNTITLED = 'Untitled tree'

/** Document ids may only contain letters, numbers, `_` and `-`. */
export function newTreeId() {
  return `tree-${crypto.randomUUID()}`
}

export function treeName(tree) {
  return tree?.tree?.name?.trim() || UNTITLED
}

export function renameTree(tree, name, now = timestamp()) {
  return { ...tree, tree: { ...tree.tree, name: name.trim() || UNTITLED, updated_at: now } }
}

/** A copy is a separate document, so person and relationship ids can stay the same. */
export function copyTree(tree, name, now = timestamp()) {
  const copy = structuredClone(tree)
  copy.tree = { ...copy.tree, uuid: crypto.randomUUID(), created_at: now }
  return renameTree(copy, name, now)
}

/** A new tree in the export format, containing one person to build from. */
export function createBlankTree({ name, person = {}, now = timestamp() }) {
  const personId = crypto.randomUUID()
  return {
    tree: {
      id: null,
      tree: '{}',
      user_id: null,
      slug: null,
      uuid: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      name: name.trim() || UNTITLED,
      is_public: false,
      undo_stack: '[]',
      background_image_url: null,
      root_id: personId,
      background_color: null,
      show_known_as: false,
      reverse_names: false,
      is_collaborator: true,
    },
    individuals: [
      {
        id: personId,
        tree_id: null,
        given_name: person.given_name || 'Given name',
        surname: person.surname || null,
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
      },
    ],
    parent_relationships: [],
    partner_relationships: [],
  }
}

export function sortTrees(index) {
  return [...index].sort((a, b) => a.name.localeCompare(b.name))
}
