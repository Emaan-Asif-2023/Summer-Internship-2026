import axios from 'axios'

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
//   timeout: 15000,
// })
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '')
  }
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8001'
  }
  return 'https://teamsync-m39e.onrender.com'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60s to handle Render free tier cold starts (can take up to 50s)
})

// Wake up the Render free tier on first load (prevents cold start timeouts)
if (typeof window !== 'undefined') {
  const base = getBaseURL()
  const hostname = window.location.hostname
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    fetch(`${base}/`).catch(() => {})
  }
}

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ts_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to /signin on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ts_token')
      localStorage.removeItem('ts_user')
      window.location.href = '/signin'
    }
    return Promise.reject(err)
  }
)

export default api
