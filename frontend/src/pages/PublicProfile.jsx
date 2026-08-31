import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Mail, Github, Linkedin, MapPin, Clock, Briefcase, User, Sparkles, CheckCircle2, UserPlus, MessageSquare
} from 'lucide-react'

const PRESET_AVATARS = [
  'from-indigo-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-fuchsia-500',
]

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function PublicProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Connection status states
  const [status, setStatus] = useState('none') // 'none' | 'connected' | 'pending_sent' | 'pending_received'
  const [connectionId, setConnectionId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch target user profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get(`/api/users/${userId}`)
      setProfile(res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to load user profile')
    }
  }, [userId])

  // Fetch connection status between current user and target user
  const fetchConnectionStatus = useCallback(async () => {
    try {
      const statusRes = await api.get('/api/connections/status')
      const data = statusRes.data
      
      if (data.connected_ids.includes(userId)) {
        setStatus('connected')
      } else if (data.pending_sent_ids.includes(userId)) {
        setStatus('pending_sent')
      } else if (data.pending_received_ids.includes(userId)) {
        setStatus('pending_received')
        // We need connection_id to respond, let's fetch incoming to find it
        const incomingRes = await api.get('/api/connections/incoming')
        const match = incomingRes.data.find(req => req.sender.id === userId)
        if (match) setConnectionId(match.id)
      } else {
        setStatus('none')
      }
    } catch (e) {
      console.error('Failed to load connection status:', e)
    }
  }, [userId])

  const loadData = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchProfile(), fetchConnectionStatus()])
    setLoading(false)
  }, [fetchProfile, fetchConnectionStatus])

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId, loadData])

  const handleConnect = async () => {
    setActionLoading(true)
    try {
      await api.post('/api/connections/request', { to_user_id: userId })
      toast.success(`Connection request sent to ${profile.name}!`, { icon: '🤝' })
      setStatus('pending_sent')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send connection request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!connectionId) return
    setActionLoading(true)
    try {
      await api.post('/api/connections/respond', { connection_id: connectionId, action: 'accept' })
      toast.success(`Connected with ${profile.name}!`, { icon: '🤝' })
      setStatus('connected')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept connection request')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-10 w-24 bg-slate-200 rounded-xl mb-4" />
        <div className="bg-white rounded-3xl p-6 border border-slate-100 flex items-center gap-6 h-36" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 h-80 bg-white rounded-3xl border border-slate-100" />
          <div className="md:col-span-2 h-80 bg-white rounded-3xl border border-slate-100" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">⚠️</div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Profile Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 mx-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    )
  }

  const initials = getInitials(profile?.name)
  
  const renderAvatarContent = (sizeClass = 'w-24 h-24 text-2xl') => {
    const avatar = profile?.avatar_url
    if (avatar) {
      if (avatar.startsWith('preset:')) {
        const gradient = avatar.split('preset:')[1]
        return (
          <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold border-4 border-white shadow-md`}>
            {initials}
          </div>
        )
      }
      return (
        <img
          src={avatar}
          alt={profile.name}
          className={`${sizeClass} rounded-full object-cover border-4 border-white shadow-md`}
        />
      )
    }
    const colorIdx = (profile?.name || '').length % PRESET_AVATARS.length
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br ${PRESET_AVATARS[colorIdx]} flex items-center justify-center text-white font-bold border-4 border-white shadow-md`}>
        {initials}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 shadow-sm transition-all active:scale-[0.98] w-fit"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Profile Header Block */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        {renderAvatarContent()}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {profile?.name}
            </h1>
            {profile?.open_to_team ? (
              <span className="inline-block text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-100 self-center">
                Open to Teams
              </span>
            ) : (
              <span className="inline-block text-[10px] font-bold tracking-wider uppercase bg-slate-50 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-100 self-center">
                Unavailable
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1">
            <Mail size={14} className="text-slate-400" />
            {profile?.email}
          </p>
          <p className="text-xs text-slate-400">
            Member since {profile?.created_at ? new Date(profile.created_at.endsWith('Z') ? profile.created_at : profile.created_at + 'Z').toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {/* Action Button based on connection status */}
        <div className="shrink-0">
          {status === 'connected' && (
            <button
              onClick={() => navigate('/chats', { state: { startChatWith: profile } })}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <MessageSquare size={15} />
              Message Peer
            </button>
          )}
          {status === 'pending_sent' && (
            <button
              disabled
              className="flex items-center gap-2 px-5 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-xs font-semibold cursor-default"
            >
              <CheckCircle2 size={15} />
              Request Sent
            </button>
          )}
          {status === 'pending_received' && (
            <button
              onClick={handleAcceptRequest}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <UserPlus size={15} />
              {actionLoading ? 'Accepting...' : 'Accept Connection'}
            </button>
          )}
          {status === 'none' && userId !== currentUser?.id && (
            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <UserPlus size={15} />
              {actionLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left panel details */}
        <div className="md:col-span-1 space-y-6">
          {/* Bio Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <User size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Bio
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{profile?.bio || 'No bio written yet.'}"
            </p>
          </div>

          {/* Academic Info */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <MapPin size={16} className="text-indigo-500 shrink-0" /> Academic Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">University / College</p>
                <p className="text-xs text-slate-700 font-semibold">{profile?.university || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Department</p>
                <p className="text-xs text-slate-700 font-semibold">{profile?.department || 'Not specified'}</p>
              </div>
              {profile?.semester && profile.semester !== 'N/A' && (
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Semester</p>
                  <p className="text-xs text-slate-700 font-semibold">{profile.semester}</p>
                </div>
              )}
              {profile?.year_of_study && (
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Year of Study</p>
                  <p className="text-xs text-slate-700 font-semibold">{profile.year_of_study === 'Others' ? 'Others' : `Year ${profile.year_of_study}`}</p>
                </div>
              )}
            </div>
          </div>

          {/* Availability & Socials */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clock size={16} className="text-emerald-500 shrink-0" /> Collaboration Info
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Availability</p>
                <p className="text-xs text-slate-700 font-semibold">{profile?.availability || 'Not specified'}</p>
              </div>
              
              {/* Social URLs */}
              <div className="pt-2 flex flex-col gap-2">
                {profile?.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors animate-in slide-in-from-bottom duration-200"
                  >
                    <Github size={14} className="text-slate-400" />
                    <span>GitHub Profile</span>
                  </a>
                )}
                {profile?.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors animate-in slide-in-from-bottom duration-200"
                  >
                    <Linkedin size={14} className="text-slate-400" />
                    <span>LinkedIn Connection</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel details */}
        <div className="md:col-span-2 space-y-6">
          {/* Preferred Roles */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Briefcase size={16} className="text-amber-500 shrink-0" /> Preferred Roles
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.roles?.length ? (
                profile.roles.map(role => (
                  <span key={role} className="text-xs font-semibold px-3.5 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100/50">
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No roles selected yet</span>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles size={16} className="text-indigo-500 shrink-0" /> Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.skills?.length ? (
                profile.skills.map(skill => (
                  <span key={skill} className="text-xs font-semibold px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No skills listed yet</span>
              )}
            </div>
          </div>

          {/* Interests */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles size={16} className="text-rose-500 shrink-0" /> Academic & Project Interests
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.interests?.length ? (
                profile.interests.map(interest => (
                  <span key={interest} className="text-xs font-semibold px-3.5 py-1.5 bg-rose-50/50 text-rose-700 rounded-xl border border-rose-100/50">
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No interests listed yet</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
