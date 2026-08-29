import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) return envUrl
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8001/api'
  }
  return 'https://teamsync-m39e.onrender.com/api'
}

const rawApiUrl = getApiBaseUrl()
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`
const WS_URL = API_BASE.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws/chat'

const authHeaders = () => {
  const token = localStorage.getItem('ts_token')
  return { Authorization: `Bearer ${token}` }
}

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const wsRef = useRef(null)
  // Other pages (e.g. Chats.jsx) can subscribe to raw socket events without
  // opening a second connection - this is the pub/sub list they attach to.
  const listenersRef = useRef(new Set())

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications', { headers: authHeaders() })
      const data = res.data || []
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (e) {
      console.error('Failed to load notifications:', e)
    }
  }, [])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, fetchNotifications])

  // One socket for the whole app, opened once per login session.
  // Keeps itself alive with a 30s ping and reconnects automatically if dropped.
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('ts_token')
    if (!token) return

    let ws = null
    let pingInterval = null
    let reconnectTimeout = null
    let dead = false  // set to true on cleanup so we stop reconnecting

    const connect = () => {
      if (dead) return
      ws = new WebSocket(`${WS_URL}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] connected')
        // Send a ping every 30s to prevent Render from closing the idle connection
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
            console.log('[WS] ping sent')
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        if (event.data === 'pong') return
        let data
        try { data = JSON.parse(event.data) } catch { return }
        console.log('[WS] received:', data.event)

        if (data.event === 'notification') {
          const n = data.notification
          setNotifications(prev => {
            const idx = prev.findIndex(p => p.id === n.id)
            if (idx !== -1) {
              const updated = [...prev]
              updated[idx] = n
              return updated
            }
            return [n, ...prev]
          })
          setUnreadCount(prev => (n.read ? prev : prev + 1))
          if (!n.read) {
            toast(n.title, {
              icon: '🔔',
              style: { borderRadius: '10px', background: '#334155', color: '#fff' },
            })
          }
        }

        // Fan out to all subscribers (Chats.jsx uses this for new_message / read_receipt)
        listenersRef.current.forEach(fn => fn(data))
      }

      ws.onerror = (e) => console.error('[WS] error', e)

      ws.onclose = (e) => {
        console.log('[WS] closed — code:', e.code, 'reason:', e.reason)
        clearInterval(pingInterval)
        if (!dead) {
          console.log('[WS] reconnecting immediately...')
          reconnectTimeout = setTimeout(connect, 0)
        }
      }
    }

    connect()

    return () => {
      dead = true
      clearInterval(pingInterval)
      clearTimeout(reconnectTimeout)
      if (ws) ws.close()
      wsRef.current = null
    }
  }, [user])

  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await api.post(`/api/notifications/${id}/read`, {}, { headers: authHeaders() })
    } catch (e) {
      console.error('Failed to mark notification read:', e)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await api.post('/api/notifications/read-all', {}, { headers: authHeaders() })
    } catch (e) {
      console.error('Failed to mark all notifications read:', e)
    }
  }, [])

  // Subscribe to raw socket events (used by Chats.jsx). Returns an unsubscribe fn.
  const subscribe = useCallback((handler) => {
    listenersRef.current.add(handler)
    return () => listenersRef.current.delete(handler)
  }, [])

  const value = { notifications, unreadCount, fetchNotifications, markRead, markAllRead, subscribe }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}
