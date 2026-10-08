import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SignIn from '../components/SignIn/SignIn.jsx'
import { config } from '../config.js'
import { decodeIdToken, loadGoogleIdentity } from '../services/googleIdentity.js'
import { clearAuthToken, loadAuthToken, saveAuthToken } from '../services/storage.js'
import { AuthContext } from './authContext.js'

/** Treat tokens as expired slightly early so requests don't race the expiry. */
const EXPIRY_MARGIN_MS = 60 * 1000
/** Google ID tokens last an hour; ask for a fresh one shortly before. */
const REFRESH_BEFORE_MS = 5 * 60 * 1000

function toSession(token) {
  try {
    const claims = decodeIdToken(token)
    const expiresAt = claims.exp * 1000
    if (expiresAt - EXPIRY_MARGIN_MS <= Date.now()) return null
    return {
      token,
      expiresAt,
      user: {
        id: claims.sub,
        name: claims.name,
        givenName: claims.given_name,
        familyName: claims.family_name,
        email: claims.email,
        picture: claims.picture,
      },
    }
  } catch {
    return null
  }
}

function restoreSession() {
  const token = loadAuthToken()
  return token ? toSession(token) : null
}

/** Shows the Google sign-in screen until the user has a valid ID token. */
function AuthProvider({ children }) {
  const [session, setSession] = useState(restoreSession)
  const [google, setGoogle] = useState(null)
  const [error, setError] = useState(null)
  const tokenRef = useRef(session?.token ?? null)

  useEffect(() => {
    tokenRef.current = session?.token ?? null
  }, [session])

  useEffect(() => {
    let cancelled = false
    loadGoogleIdentity()
      .then((id) => {
        if (cancelled) return
        id.initialize({
          client_id: config.googleClientId,
          auto_select: true,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
          callback: ({ credential }) => {
            const next = toSession(credential)
            if (!next) {
              setError('Google returned an expired sign-in. Please try again.')
              return
            }
            saveAuthToken(credential)
            setError(null)
            // Keep the same user object on refresh so consumers don't reset.
            setSession((prev) =>
              prev?.user.id === next.user.id ? { ...next, user: prev.user } : next,
            )
          },
        })
        setGoogle(id)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const now = Date.now()
    const refresh =
      google &&
      setTimeout(() => google.prompt(), Math.max(0, session.expiresAt - REFRESH_BEFORE_MS - now))
    const expire = setTimeout(
      () => {
        clearAuthToken()
        setSession(null)
      },
      Math.max(0, session.expiresAt - EXPIRY_MARGIN_MS - now),
    )
    return () => {
      clearTimeout(refresh)
      clearTimeout(expire)
    }
  }, [session, google])

  const getToken = useCallback(() => tokenRef.current, [])
  const signOut = useCallback(() => {
    google?.disableAutoSelect()
    clearAuthToken()
    setSession(null)
  }, [google])

  const user = session?.user ?? null
  const value = useMemo(() => ({ user, getToken, signOut }), [user, getToken, signOut])

  if (!session) return <SignIn google={google} error={error} />

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
