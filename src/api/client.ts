import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guest_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function ensureGuestSession(): Promise<void> {
  if (localStorage.getItem('guest_token')) return

  let guestId = localStorage.getItem('guest_id')
  if (!guestId) {
    guestId = crypto.randomUUID()
    localStorage.setItem('guest_id', guestId)
  }

  try {
    const res = await api.post('/api/auth/guest', { guest_id: guestId })
    localStorage.setItem('guest_token', res.data.access_token)
  } catch (e) {
    console.error('Guest session failed', e)
  }
}
