const DATE_PATTERN = /^\d{4}(-\d{1,2}(-\d{1,2})?)?$/

export const DATE_FORMAT_ERROR = 'Dates must be YYYY, YYYY-MM or YYYY-MM-DD.'

export function isValidDate(value) {
  const trimmed = (value ?? '').trim()
  return !trimmed || DATE_PATTERN.test(trimmed)
}

/** Turns "1984-7-28", "1984-07" or "1984" into a sortable number. */
export function dateSortKey(date) {
  const match = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(date ?? '')
  if (!match) return null
  const [, y, m = 0, d = 0] = match
  return Number(y) * 10000 + Number(m) * 100 + Number(d)
}

/** Validates that both dates are well-formed and `from` isn't after `to`. */
export function validateDateRange(from, to, rangeError) {
  if (!isValidDate(from) || !isValidDate(to)) return DATE_FORMAT_ERROR
  const fromKey = dateSortKey(from)
  const toKey = dateSortKey(to)
  if (fromKey && toKey && toKey < fromKey) return rangeError
  return null
}
