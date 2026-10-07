async function errorMessage(res, fallback) {
  const body = await res.json().catch(() => null)
  return body?.error ?? fallback
}

export async function fetchBackup() {
  const res = await fetch('/api/tree')
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not load backup'))
  return res.json()
}

export async function saveBackup(tree) {
  const res = await fetch('/api/tree', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tree),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Backup failed'))
}

export async function uploadPhoto(file) {
  const body = new FormData()
  body.append('photo', file)
  let res
  try {
    res = await fetch('/api/photos', { method: 'POST', body })
  } catch {
    throw new Error('Could not reach the server to upload the photo.')
  }
  if (!res.ok) throw new Error(await errorMessage(res, 'Photo upload failed'))
  const { url } = await res.json()
  return url
}

/** Uploads files in parallel; returns uploaded URLs and per-file errors. */
export async function uploadPhotos(files) {
  const results = await Promise.allSettled(files.map(uploadPhoto))
  return {
    urls: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    errors: results
      .map((r, i) => (r.status === 'rejected' ? `${files[i].name}: ${r.reason.message}` : null))
      .filter(Boolean),
  }
}
