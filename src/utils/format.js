export function yearOf(date) {
  return /^(\d{4})/.exec(date ?? '')?.[1] ?? ''
}

export function fullName(person, settings = {}) {
  const given = settings.showKnownAs && person.known_as ? person.known_as : person.given_name
  const parts = settings.reverseNames ? [person.surname, given] : [given, person.surname]
  return parts.filter(Boolean).join(' ') || 'Unknown'
}

const normalizeSurname = (name) => (name ?? '').replace(/[’‘]/g, "'").trim().toLowerCase()

/** Birth surname for women whose surname changed, e.g. after marriage. */
export function birthSurname(person) {
  if (person.gender !== 'Female' || !person.surname_at_birth) return null
  const changed = normalizeSurname(person.surname_at_birth) !== normalizeSurname(person.surname)
  return changed ? person.surname_at_birth : null
}

export function hasMarriageDetails(partnership) {
  return Boolean(
    partnership.marriageDate || partnership.marriageLocation || partnership.divorceDate,
  )
}

export function marriageTooltip(partnership) {
  const married = yearOf(partnership.marriageDate)
  const divorced = yearOf(partnership.divorceDate)
  return [married ? `Married ${married}` : 'Married', divorced && `divorced ${divorced}`]
    .filter(Boolean)
    .join(', ')
}

export function isDeceased(person) {
  return Boolean(person.is_deceased || person.date_of_death)
}

export function lifespan(person) {
  const birth = yearOf(person.date_of_birth)
  const death = yearOf(person.date_of_death)
  if (birth && death) return `${birth} – ${death}`
  if (birth) return isDeceased(person) ? birth : `${birth} – Living`
  if (death) return `? – ${death}`
  return ''
}
