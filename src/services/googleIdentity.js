const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let loading = null

/** Loads Google Identity Services once and resolves to `google.accounts.id`. */
export function loadGoogleIdentity() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(window.google.accounts.id)
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Could not load Google sign-in. Check your connection and try again.'))
    }
    document.head.append(script)
  })
  return loading
}

/** Reads the claims of a JWT without verifying it; the API does the verification. */
export function decodeIdToken(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}
