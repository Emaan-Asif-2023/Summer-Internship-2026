import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import {
  Bell, Users, Check, X, MapPin, Mail, Sparkles, MessageSquare, Briefcase
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const getHeaders = () => {
  const token = localStorage.getItem('ts_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const AVATAR_COLORS = [
  'from-indigo-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-fuchsia-500',
  'from-lime-400 to-green-500',
  'from-sky-400 to-indigo-500',
]

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('incoming') // 'incoming' | 'active'
  const [incoming, setIncoming] = useState([])
  const [activeConnections, setActiveConnections] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchIncoming = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/connections/incoming`, { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setIncoming(data)
      }
    } catch (e) {
      console.error('Failed to fetch incoming requests:', e)
    }
  }, [])

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/connections`, { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setActiveConnections(data)
      }
    } catch (e) {
      console.error('Failed to fetch active connections:', e)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    if (activeTab === 'incoming') {
      await fetchIncoming()
    } else {
      await fetchActive()
    }
    setLoading(false)
  }, [activeTab, fetchIncoming, fetchActive])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  const handleRespond = async (connectionId, action, senderName) => {
    try {
      const res = await fetch(`${API_BASE}/connections/respond`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ connection_id: connectionId, action })
      })
      if (res.ok) {
        if (action === 'accept') {
          toast.success(`Connected with ${senderName}!`, { icon: '🤝' })
        } else {
          toast.success(`Request from ${senderName} declined.`)
        }
        loadData()
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Action failed')
      }
    } catch {
      toast.error('Network error. Action failed.')
    }
  }

  const renderAvatar = (person) => {
    const initials = getInitials(person.name)
    if (person?.avatar_url) {
      if (person.avatar_url.startsWith('preset:')) {
        const gradient = person.avatar_url.split('preset:')[1]
        return (
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}>
            {initials}
          </div>
        )
      }
      return (
        <img
          src={person.avatar_url}
          alt={person.name}
          className="w-12 h-12 rounded-full object-cover border border-slate-100 shrink-0 shadow-sm"
        />
      )
    }
    const colorIdx = (person?.name || '').length % AVATAR_COLORS.length
    return (
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}>
        {initials}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Bell size={18} />
          </div>
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Notifications
            </h1>
            <p className="text-xs text-slate-500 -mt-0.5">
              Manage your peer connection requests and invitations
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'incoming'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bell size={15} />
          Requests {incoming.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">{incoming.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'active'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={15} />
          Connections {activeConnections.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-slate-400 text-white text-[10px] font-bold rounded-full">{activeConnections.length}</span>}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="w-1/4 h-4 bg-slate-200 rounded" />
                  <div className="w-1/3 h-3 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-20 h-9 bg-slate-100 rounded-xl" />
                <div className="w-20 h-9 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
              <Bell size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">All caught up!</h3>
            <p className="text-sm text-slate-400">You don't have any pending connection requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incoming.map(req => (
              <div
                key={req.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <Link to={`/profile/user/${req.sender.id}`} className="shrink-0 hover:opacity-90 transition-opacity">
                    {renderAvatar(req.sender)}
                  </Link>
                  <div>
                    <Link to={`/profile/user/${req.sender.id}`} className="hover:text-indigo-600 transition-colors inline-block w-fit">
                      <h3 className="text-sm font-semibold text-slate-800 leading-tight">{req.sender.name}</h3>
                    </Link>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
                      <MapPin size={11} className="shrink-0 text-slate-400" />
                      <span className="truncate">{req.sender.university || 'No university'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>{req.sender.department || 'No dept'}</span>
                      {req.sender.semester && req.sender.semester !== 'N/A' && (
                        <>
                          <span>·</span>
                          <span>Sem {req.sender.semester}</span>
                        </>
                      )}
                    </p>

                    {/* Skills */}
                    {req.sender.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {req.sender.skills.slice(0, 3).map(skill => (
                          <span key={skill} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                            {skill}
                          </span>
                        ))}
                        {req.sender.skills.length > 3 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
                            +{req.sender.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Response Actions */}
                <div className="flex sm:flex-col justify-end gap-2 sm:self-center shrink-0">
                  <button
                    onClick={() => handleRespond(req.id, 'accept', req.sender.name)}
                    className="flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    <Check size={14} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'decline', req.sender.name)}
                    className="flex items-center justify-center gap-1 px-4 py-2 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-600 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                  >
                    <X size={14} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
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
            <div
              key={conn.connection_id}
              className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all flex flex-col justify-between gap-4"
            >
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
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>{conn.user.department || 'No dept'}</span>
                    {conn.user.semester && conn.user.semester !== 'N/A' && (
                      <>
                        <span>·</span>
                        <span>Sem {conn.user.semester}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Skills */}
              {conn.user.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {conn.user.skills.slice(0, 3).map(skill => (
                    <span key={skill} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {skill}
                    </span>
                  ))}
                  {conn.user.skills.length > 3 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
                      +{conn.user.skills.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-50">
                <Link
                  to={`/profile/user/${conn.user.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition-all"
                >
                  View Profile
                </Link>
                <button
                  onClick={() => navigate('/chats', { state: { startChatWith: conn.user } })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  <MessageSquare size={13} />
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
