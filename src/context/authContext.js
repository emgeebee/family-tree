import { createContext } from 'react'

/** Default value when sign-in is disabled (no Google client id configured). */
export const AuthContext = createContext({
  user: null,
  getToken: () => null,
  signOut: null,
})
