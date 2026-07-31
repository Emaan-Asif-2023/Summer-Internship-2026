import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import {
  Bell, Users, Check, X, MapPin, Mail, MessageSquare,
  UserPlus, CheckCircle2, FolderKanban, Inbox
} from 'lucide-react'

const authHeaders = () => {
  const token = localStorage.getItem('ts_token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

const AVATAR_COLORS = [
  'from-indigo-400 to-purple-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500', 'from-violet-400 to-fuchsia-500',
]

const getInitials = (name) => (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TABS = [
  { key: 'all', label: 'All', icon: Bell },
  { key: 'requests', label: 'Requests', icon: UserPlus },
  { key: 'invitations', label: 'Invitations', icon: Mail },
  { key: 'updates', label: 'Updates', icon: FolderKanban },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'connections', label: 'Connections', icon: Users },
]

const ICONS = {
  connection_request: UserPlus,
  connection_accepted: CheckCircle2,
  project_invitation: Mail,
  project_join_request: Inbox,
  project_accepted: CheckCircle2,
  project_update: FolderKanban,
  message: MessageSquare,
}

const ICON_COLORS = {
  connection_request: 'text-indigo-500 bg-indigo-50',
  connection_accepted: 'text-emerald-500 bg-emerald-50',
  project_invitation: 'text-indigo-500 bg-indigo-50',
  project_join_request: 'text-amber-500 bg-amber-50',
  project_accepted: 'text-emerald-500 bg-emerald-50',
  project_update: 'text-slate-500 bg-slate-100',
  message: 'text-blue-500 bg-blue-50',
}

function NotificationCard({ n, onAction, onOpen }) {
  const Icon = ICONS[n.type] || Bell
  const colorClass = ICON_COLORS[n.type] || 'text-slate-500 bg-slate-100'
  const isActionable = n.type === 'connection_request' || n.type === 'project_invitation' || n.type === 'project_join_request'

  return (
    <div className={`bg-white rounded-2xl p-4 border transition-all flex items-start gap-3 ${
      !n.read ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${!n.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
        {n.body && <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>}
        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>

        {isActionable ? (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAction(n, 'decline')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-all"
            >
              <X size={12} /> Decline
            </button>
            <button
              onClick={() => onAction(n, 'accept')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all"
            >
              <Check size={12} /> Accept
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpen(n)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2"
          >
            View →
          </button>
        )}
      </div>

      {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />}
    </div>
  )
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notifications, markRead, markAllRead, fetchNotifications } = useNotifications()

  const [tab, setTab] = useState('all')
  const [activeConnections, setActiveConnections] = useState([])
  const [loadingConnections, setLoadingConnections] = useState(false)

  const fetchActiveConnections = useCallback(async () => {
    setLoadingConnections(true)
    try {
      const res = await api.get('/api/connections', { headers: authHeaders() })
      setActiveConnections(res.data || [])
    } catch (e) {
      console.error('Failed to fetch active connections:', e)
    }
    setLoadingConnections(false)
  }, [])

  useEffect(() => {
    if (tab === 'connections') fetchActiveConnections()
  }, [tab, fetchActiveConnections])

  const filtered = notifications.filter(n => {
    if (tab === 'all' || tab === 'connections') return true
    if (tab === 'requests') return n.type === 'connection_request' || n.type === 'project_join_request'
    if (tab === 'invitations') return n.type === 'project_invitation'
    if (tab === 'updates') return n.type === 'project_accepted' || n.type === 'project_update' || n.type === 'connection_accepted'
    if (tab === 'messages') return n.type === 'message'
    return true
  })

  const handleAction = async (n, action) => {
    try {
      if (n.type === 'connection_request') {
        await api.post('/api/connections/respond', {
          connection_id: n.data.connection_id, action,
        }, { headers: authHeaders() })
      } else if (n.type === 'project_invitation') {
        await api.post(`/api/projects/invitations/${n.data.invitation_id}/respond`, { action }, { headers: authHeaders() })
      } else if (n.type === 'project_join_request') {
        await api.post(`/api/projects/requests/${n.data.request_id}/respond`, { action }, { headers: authHeaders() })
      }
      toast.success(action === 'accept' ? 'Accepted' : 'Declined')
      await markRead(n.id)
      await fetchNotifications()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    }
  }

  const handleOpen = async (n) => {
    if (!n.read) await markRead(n.id)
    if (n.type === 'message') {
      navigate('/chats', { state: { startChatWith: { id: n.data?.peer_id } } })
    } else if (n.data?.project_id) {
      navigate(`/projects/${n.data.project_id}`)
    }
  }

  const renderAvatar = (person) => {
    const initials = getInitials(person.name)
    if (person?.avatar_url && !person.avatar_url.startsWith('preset:')) {
      return <img src={person.avatar_url} alt={person.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 shrink-0 shadow-sm" />
    }
    const colorIdx = (person?.name || '').length % AVATAR_COLORS.length
    return (
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}>
        {initials}
      </div>
    )
  }

  const unreadInTab = filtered.filter(n => !n.read).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Bell size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Notifications
            </h1>
            <p className="text-xs text-slate-500 -mt-0.5">Requests, invitations, updates, and messages in one place</p>
          </div>
        </div>
        {tab !== 'connections' && notifications.some(n => !n.read) && (
          <button
            onClick={markAllRead}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6 overflow-x-auto">
        {TABS.map(t => {
          const count = t.key === 'all'
            ? notifications.filter(n => !n.read).length
            : t.key === 'connections'
              ? 0
              : notifications.filter(n => !n.read && (
                  t.key === 'requests' ? (n.type === 'connection_request' || n.type === 'project_join_request') :
                  t.key === 'invitations' ? n.type === 'project_invitation' :
                  t.key === 'updates' ? (n.type === 'project_accepted' || n.type === 'project_update' || n.type === 'connection_accepted') :
                  t.key === 'messages' ? n.type === 'message' : false
                )).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={14} />
              {t.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'connections' ? (
        loadingConnections ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse h-20" />
            ))}
          </div>
        ) : activeConnections.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
              <Users size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No connections yet</h3>
            <p className="text-sm text-slate-400">Discover and connect with students to collaborate on projects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeConnections.map(conn => (
              <div key={conn.connection_id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Link to={`/profile/user/${conn.user.id}`} className="shrink-0 hover:opacity-90 transition-opacity">
                    {renderAvatar(conn.user)}
                  </Link>
                  <div>
                    <Link to={`/profile/user/${conn.user.id}`} className="hover:text-indigo-600 transition-colors inline-block w-fit">
                      <h3 className="text-sm font-semibold text-slate-800 leading-tight">{conn.user.name}</h3>
                    </Link>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
                      <MapPin size={11} className="shrink-0 text-slate-400" />
                      <span className="truncate">{conn.user.university || 'No university'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-50">
                  <Link to={`/profile/user/${conn.user.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition-all">
                    View Profile
                  </Link>
                  <button
                    onClick={() => navigate('/chats', { state: { startChatWith: conn.user } })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    <MessageSquare size={13} /> Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
            <Bell size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">All caught up!</h3>
          <p className="text-sm text-slate-400">Nothing here right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <NotificationCard key={n.id} n={n} onAction={handleAction} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
