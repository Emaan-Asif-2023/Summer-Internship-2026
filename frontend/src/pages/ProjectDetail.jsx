import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  ArrowLeft,
  Calendar,
  Users,
  Shield,
  Check,
  X,
  DoorOpen,
  Trash2,
  AlertCircle,
  Clock
} from 'lucide-react'
import api from '../api/axios.js'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-700',
]

const renderAvatar = (user, sizeClass = "w-10 h-10", textClass = "text-xs") => {
  const name = user?.name || ''
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  const avatar = user?.avatar_url
  const hasAvatar = avatar && avatar !== 'None' && avatar !== 'null' && avatar !== ''

  if (hasAvatar && !avatar.startsWith('preset:')) {
    return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover border border-slate-100 shrink-0`} />
  }
  
  let gradient = 'from-primary to-secondary'
  if (hasAvatar && avatar.startsWith('preset:')) {
    gradient = avatar.split('preset:')[1]
  } else {
    const colorIdx = name.length % AVATAR_COLORS.length
    gradient = AVATAR_COLORS[colorIdx]
  }
  
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0 ${textClass} shadow-sm`}>
      {initials}
    </div>
  )
}

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Request to join form state
  const [joinMessage, setJoinMessage] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [hasSentRequest, setHasSentRequest] = useState(false)

  // Owner admin states
  const [incomingRequests, setIncomingRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Load project details
  const fetchProject = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/projects/${projectId}`, { headers: authHeaders() })
      setProject(res.data)
      setError(null)
      
      // Check if user has already sent a request to this project
      const sentRes = await api.get('/api/projects/requests/sent', { headers: authHeaders() })
      const pendingRequest = sentRes.data?.find(r => r.project.id === projectId && r.status === 'pending')
      if (pendingRequest) {
        setHasSentRequest(true)
      }
    } catch (e) {
      console.error(e)
      setError(e.response?.data?.detail || 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  // Load join requests (for owner only)
  const fetchIncomingRequests = async () => {
    if (!project || !project.is_owner) return
    setLoadingRequests(true)
    try {
      const res = await api.get('/api/projects/requests/received', { headers: authHeaders() })
      // Filter requests by current project ID
      const filtered = res.data?.filter(r => r.project.id === projectId && r.status === 'pending') || []
      setIncomingRequests(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [projectId])

  useEffect(() => {
    if (project && project.is_owner) {
      fetchIncomingRequests()
    }
  }, [project])

  const handleJoinRequest = async (e) => {
    e.preventDefault()
    setSendingRequest(true)
    try {
      await api.post(`/api/projects/${projectId}/request`, { message: joinMessage }, { headers: authHeaders() })
      toast.success('Join request sent successfully!')
      setHasSentRequest(true)
      setJoinMessage('')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send join request')
    } finally {
      setSendingRequest(false)
    }
  }

  const handleLeaveProject = async () => {
    if (!window.confirm('Are you sure you want to leave this project?')) return
    try {
      await api.post(`/api/projects/${projectId}/leave`, {}, { headers: authHeaders() })
      toast.success('You have left the project')
      fetchProject()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to leave project')
    }
  }

  const handleDeleteProject = async () => {
    if (!window.confirm('CRITICAL: Are you sure you want to delete this project? This action is irreversible.')) return
    try {
      await api.delete(`/api/projects/${projectId}`, { headers: authHeaders() })
      toast.success('Project deleted successfully')
      navigate('/projects')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete project')
    }
  }

  const handleRespondToRequest = async (requestId, action) => {
    try {
      await api.post(`/api/projects/requests/${requestId}/respond`, { action }, { headers: authHeaders() })
      toast.success(`Request ${action}ed successfully!`)
      fetchIncomingRequests()
      fetchProject()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to respond to request')
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading project details...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800 mb-1">Error Loading Project</h2>
        <p className="text-slate-500 text-sm mb-6">{error || 'Project not found'}</p>
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <ArrowLeft size={14} /> Back to Projects
        </button>
      </div>
    )
  }

  const isMember = project.member_ids?.includes(currentUser?.id) || project.members?.some(m => m.id === currentUser?.id)
  const isFull = (project.member_ids?.length || 0) >= (project.max_members || 5)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Main card */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex items-center flex-wrap gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                project.status === 'Recruiting' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                project.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                'bg-slate-50 text-slate-600 border border-slate-200'
              }`}>
                {project.status}
              </span>
              {project.is_owner && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1">
                  <Shield size={10} /> Owner
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {project.title}
            </h1>
            <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users size={13} className="text-slate-300" />
                {project.member_ids?.length || 0} / {project.max_members || 5} members
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-300" />
                Created {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action buttons for owner */}
          {project.is_owner && (
            <button
              onClick={handleDeleteProject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-100 hover:bg-rose-50 rounded-xl transition-all shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 size={13} /> Delete Project
            </button>
          )}

          {/* Action buttons for members */}
          {isMember && !project.is_owner && (
            <button
              onClick={handleLeaveProject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-100 hover:bg-rose-50 rounded-xl transition-all shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <DoorOpen size={13} /> Leave Project
            </button>
          )}
        </div>

        {/* Layout details body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Details column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">About the Project</h3>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                {project.description || 'No description provided.'}
              </p>
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {project.skills?.map(skill => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 text-[10px] font-semibold transition-colors"
                  >
                    {skill}
                  </span>
                )) || <span className="text-xs text-slate-400">No specific skills listed.</span>}
              </div>
            </div>

            {/* Join Request form / pending requests list */}
            {!project.is_owner && !isMember && (
              <div className="border border-indigo-50 bg-indigo-50/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-600" />
                  Join Project
                </h3>

                {hasSentRequest ? (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                    <Clock size={15} className="shrink-0" />
                    <span>Your request to join this project is pending approval.</span>
                  </div>
                ) : isFull ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-xl p-3.5">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>This project has reached its maximum capacity.</span>
                  </div>
                ) : (
                  <form onSubmit={handleJoinRequest} className="space-y-3">
                    <p className="text-[11px] text-slate-400">
                      Send a request to the project owner explaining why you'd like to join and how your skills fit.
                    </p>
                    <textarea
                      placeholder="Enter an optional message..."
                      value={joinMessage}
                      onChange={e => setJoinMessage(e.target.value)}
                      rows={3}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    />
                    <button
                      type="submit"
                      disabled={sendingRequest}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
                    >
                      {sendingRequest ? 'Sending...' : 'Request to Join'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Admin view: Received Join Requests */}
            {project.is_owner && (
              <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-600" />
                  Incoming Join Requests ({incomingRequests.length})
                </h3>

                {loadingRequests ? (
                  <p className="text-xs text-slate-400">Loading requests...</p>
                ) : incomingRequests.length === 0 ? (
                  <p className="text-xs text-slate-400">No pending join requests for this project.</p>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map(req => (
                      <div key={req.id} className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-slate-50/20">
                        <div className="min-w-0 space-y-1">
                          <Link to={`/profile/user/${req.requester.id}`} className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors block">
                            {req.requester.name}
                          </Link>
                          <p className="text-[10px] text-slate-400">{req.requester.university} • {req.requester.department}</p>
                          {req.message && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 mt-2">
                              "{req.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleRespondToRequest(req.id, 'decline')}
                            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all"
                            title="Decline"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => handleRespondToRequest(req.id, 'accept')}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                            title="Accept"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right sidebar details column */}
          <div className="space-y-6">
            
            {/* Owner Section */}
            <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owner</h3>
              <div className="flex items-center gap-3">
                {renderAvatar(project.owner, "w-10 h-10", "text-xs")}
                <div className="min-w-0">
                  <Link to={`/profile/user/${project.owner_id}`} className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors block truncate">
                    {project.owner?.name || 'Owner'}
                  </Link>
                  <p className="text-[10px] text-slate-400 truncate">{project.owner?.email}</p>
                </div>
              </div>
            </div>

            {/* Members list */}
            <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Members ({project.members?.length || 0})</h3>
              
              {project.members?.length === 0 ? (
                <p className="text-xs text-slate-400">No members have joined yet.</p>
              ) : (
                <div className="space-y-3">
                  {project.members?.map(member => (
                    <div key={member.id} className="flex items-center gap-3">
                      {renderAvatar(member, "w-8 h-8", "text-[10px]")}
                      <div className="min-w-0">
                        <Link to={`/profile/user/${member.id}`} className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors block truncate">
                          {member.name}
                        </Link>
                        <p className="text-[9px] text-slate-400 truncate">{member.university || 'No university'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
