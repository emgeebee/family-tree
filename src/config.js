const env = import.meta.env

export const config = {
  googleClientId: env.VITE_GOOGLE_CLIENT_ID,
  /** Base URL of the docs API (`/docs`, `/shared` endpoints). */
  apiBaseUrl: env.VITE_API_BASE_URL.replace(/\/+$/, ''),
  photoUploads: env.VITE_PHOTO_UPLOADS === 'true',
}
