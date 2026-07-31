import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
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
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('ts_token')
    if (!token) return

    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      let data
      try { data = JSON.parse(event.data) } catch { return }

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

      // Fan every event out to subscribers (Chats.jsx listens for
      // 'new_message' / 'read_receipt' this way instead of opening its own socket)
      listenersRef.current.forEach(fn => fn(data))
    }

    ws.onerror = () => console.error('Notification WebSocket error')

    return () => {
      ws.close()
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
