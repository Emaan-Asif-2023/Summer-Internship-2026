import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext.jsx'
import {
  Bell, UserPlus, Mail, CheckCircle2, MessageSquare, FolderKanban
} from 'lucide-react'

const ICONS = {
  connection_request: UserPlus,
  connection_accepted: CheckCircle2,
  project_invitation: Mail,
  project_join_request: UserPlus,
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

function timeAgo(dateStr) {
  // Ensure UTC parsing by appending Z if not present
  const utcStr = dateStr && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr
  const diff = (Date.now() - new Date(utcStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function routeFor(n) {
  switch (n.type) {
    case 'message':
      return { pathname: '/chats', state: { startChatWith: { id: n.data?.peer_id } } }
    case 'connection_request':
    case 'connection_accepted':
      return { pathname: '/notifications' }
    case 'project_invitation':
    case 'project_join_request':
      return { pathname: '/projects' }
    case 'project_accepted':
    case 'project_update':
      return { pathname: n.data?.project_id ? `/projects/${n.data.project_id}` : '/projects' }
    default:
      return { pathname: '/notifications' }
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleClick = (n) => {
    if (!n.read) markRead(n.id)
    setOpen(false)
    const route = routeFor(n)
    navigate(route.pathname, route.state ? { state: route.state } : undefined)
  }

  const recent = notifications.slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-100 shadow-lg z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            <button
              onClick={() => navigate('/notifications')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell size={22} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No notifications yet</p>
              </div>
            ) : (
              recent.map(n => {
                const Icon = ICONS[n.type] || Bell
                const colorClass = ICON_COLORS[n.type] || 'text-slate-500 bg-slate-100'
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                      !n.read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-snug ${!n.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{n.body}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)} ago</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
