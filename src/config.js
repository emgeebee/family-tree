const env = import.meta.env

export const config = {
  /** Google OAuth client id; sign-in is skipped when empty (local dev). */
  googleClientId: env.VITE_GOOGLE_CLIENT_ID || '',
  /** Base URL of the backup API, which exposes `/docs` endpoints. */
  apiBaseUrl: (env.VITE_API_BASE_URL || '/api').replace(/\/+$/, ''),
  photoUploads: env.VITE_PHOTO_UPLOADS === 'true',
}
