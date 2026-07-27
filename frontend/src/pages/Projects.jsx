import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, LogOut, Mail, Inbox, Send,
  UserPlus, Check, X, Clock, Users, FolderKanban,
  Search, Loader2, Sparkles, ChevronDown
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const getHeaders = () => {
  const token = localStorage.getItem('ts_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders(), ...options })
  let data = null
  try { data = await res.json() } catch { /* no body */ }
  if (!res.ok) {
    throw new Error((data && data.detail) || `Request failed (${res.status})`)
  }
  return data
}

const PROJECT_STATUSES = ['Recruiting', 'In Progress', 'Completed']

const STATUS_CONFIG = {
  Recruiting: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  'In Progress': 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  Completed: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

const TABS = [
  { key: 'my', label: 'My Projects', icon: FolderKanban },
  { key: 'joined', label: 'Joined', icon: Users },
  { key: 'invitations', label: 'Invitations', icon: Mail },
  { key: 'requests', label: 'Requests', icon: Inbox },
]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Section({ children, empty, emptyIcon: EmptyIcon, emptyText, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading...
      </div>
    )
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <EmptyIcon size={28} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-400 max-w-xs text-center">{emptyText}</p>
      </div>
    )
  }
  return children
}

function SkillChips({ skills = [], limit = 4 }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, limit).map(s => (
        <span key={s} className="text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
          {s}
        </span>
      ))}
      {skills.length > limit && (
        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
          +{skills.length - limit}
        </span>
      )}
    </div>
  )
}

// ---------- My Project Card ----------

function MyProjectCard({ project, onEdit, onDelete, onInvite, onManageRequests }) {
  const navigate = useNavigate()
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status] || 'bg-slate-100 text-slate-500'}`}>
          {project.status}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Users size={12} />
          {project.member_count}/{project.max_members}
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-800 mb-1.5">{project.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
        {project.description}
      </p>

      <div className="mb-4"><SkillChips skills={project.skills} limit={3} /></div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={() => navigate(`/projects/${project.id}`)}
          className="py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all"
        >
          View
        </button>
        <button
          onClick={() => onInvite(project)}
          className="py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center gap-1"
        >
          <UserPlus size={13} /> Invite
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onEdit(project)}
          className="py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-1"
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          onClick={() => onDelete(project)}
          className="py-2 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-1"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  )
}

// ---------- Joined Project Card ----------

function JoinedProjectCard({ project, onLeave }) {
  const navigate = useNavigate()
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status] || 'bg-slate-100 text-slate-500'}`}>
          {project.status}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Users size={12} />
          {project.member_count}/{project.max_members}
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-800 mb-1.5">{project.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
        {project.description}
      </p>
      <p className="text-[11px] text-slate-400 mb-3">Owned by {project.owner_name}</p>

      <div className="mb-4"><SkillChips skills={project.skills} limit={3} /></div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate(`/projects/${project.id}`)}
          className="py-2 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all"
        >
          View
        </button>
        <button
          onClick={() => onLeave(project)}
          className="py-2 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-1"
        >
          <LogOut size={13} /> Leave
        </button>
      </div>
    </div>
  )
}

// ---------- Invitation Card ----------

function InvitationCard({ invitation, onRespond }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[invitation.project.status] || 'bg-slate-100 text-slate-500'}`}>
            {invitation.project.status}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock size={10} /> {timeAgo(invitation.created_at)}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-800">{invitation.project.title}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Invited by <span className="font-semibold text-slate-600">{invitation.invited_by.name}</span>
        </p>
        <div className="mt-2"><SkillChips skills={invitation.project.skills} limit={4} /></div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onRespond(invitation.id, 'decline')}
          className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1"
        >
          <X size={13} /> Decline
        </button>
        <button
          onClick={() => onRespond(invitation.id, 'accept')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1"
        >
          <Check size={13} /> Accept
        </button>
      </div>
    </div>
  )
}

// ---------- Request Cards ----------

function SentRequestCard({ request }) {
  const statusStyles = {
    pending: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
    accepted: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    declined: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  }
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 truncate">{request.project.title}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
          <Clock size={10} /> {timeAgo(request.created_at)}
        </p>
      </div>
      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 capitalize ${statusStyles[request.status]}`}>
        {request.status}
      </span>
    </div>
  )
}

function ReceivedRequestCard({ request, onRespond }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 mb-1">for <span className="font-semibold text-slate-600">{request.project.title}</span></p>
        <h3 className="text-sm font-bold text-slate-800">{request.requester.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {request.requester.university || 'No university'} {request.requester.department ? `· ${request.requester.department}` : ''}
        </p>
        {request.message && (
          <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 rounded-lg px-3 py-2">"{request.message}"</p>
        )}
        <div className="mt-2"><SkillChips skills={request.requester.skills} limit={4} /></div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onRespond(request.id, 'decline')}
          className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1"
        >
          <X size={13} /> Decline
        </button>
        <button
          onClick={() => onRespond(request.id, 'accept')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1"
        >
          <Check size={13} /> Accept
        </button>
      </div>
    </div>
  )
}

// ---------- Create / Edit Project Modal ----------

function ProjectFormModal({ project, onClose, onSaved }) {
  const isEdit = !!project
  const [title, setTitle] = useState(project?.title || '')
  const [description, setDescription] = useState(project?.description || '')
  const [skillsInput, setSkillsInput] = useState((project?.skills || []).join(', '))
  const [maxMembers, setMaxMembers] = useState(project?.max_members || 5)
  const [projStatus, setProjStatus] = useState(project?.status || 'Recruiting')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required')
      return
    }
    const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean)

    setSaving(true)
    try {
      if (isEdit) {
        await apiRequest(`/projects/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title, description, skills, max_members: Number(maxMembers), status: projStatus }),
        })
        toast.success('Project updated')
      } else {
        await apiRequest('/projects', {
          method: 'POST',
          body: JSON.stringify({ title, description, skills, max_members: Number(maxMembers), status: projStatus }),
        })
        toast.success('Project created')
      }
      onSaved()
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Project' : 'Create New Project'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. AI-Powered Study Planner"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="What is this project about? What are you building?"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Skills needed (comma separated)</label>
            <input
              value={skillsInput}
              onChange={e => setSkillsInput(e.target.value)}
              placeholder="React, Python, Figma"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Max members</label>
              <input
                type="number"
                min={1}
                value={maxMembers}
                onChange={e => setMaxMembers(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Status</label>
              <select
                value={projStatus}
                onChange={e => setProjStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
              >
                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Invite Members Modal ----------

function InviteModal({ project, onClose }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [invitedIds, setInvitedIds] = useState([])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    async function search() {
      setLoading(true)
      try {
        const qs = new URLSearchParams({ search: debounced, page: 1, limit: 10 }).toString()
        const data = await apiRequest(`/discover/students?${qs}`)
        setResults((data.results || []).filter(s => s.id !== project.owner_id))
      } catch {
        setResults([])
      }
      setLoading(false)
    }
    search()
  }, [debounced, project.owner_id])

  const handleInvite = async (student) => {
    try {
      await apiRequest(`/projects/${project.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ to_user_id: student.id }),
      })
      toast.success(`Invited ${student.name}`)
      setInvitedIds(prev => [...prev, student.id])
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Invite Members</h2>
            <p className="text-xs text-slate-400">{project.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search students by name or skill..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">No students found</p>
          ) : (
            results.map(s => {
              const invited = invitedIds.includes(s.id)
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(s.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{s.university || 'No university'}</p>
                  </div>
                  <button
                    disabled={invited}
                    onClick={() => handleInvite(s)}
                    className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      invited
                        ? 'bg-emerald-50 text-emerald-600 cursor-default'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {invited ? 'Invited' : 'Invite'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Confirm Delete Modal ----------

function ConfirmDeleteModal({ project, onClose, onConfirmed }) {
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiRequest(`/projects/${project.id}`, { method: 'DELETE' })
      toast.success('Project deleted')
      onConfirmed()
    } catch (err) {
      toast.error(err.message)
    }
    setDeleting(false)
  }
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <h2 className="text-base font-bold text-slate-800 mb-2">Delete "{project.title}"?</h2>
        <p className="text-sm text-slate-500 mb-6">
          This will permanently remove the project along with all its invitations and join requests. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function Projects() {
  const [tab, setTab] = useState('my')
  const [requestsSubTab, setRequestsSubTab] = useState('received')

  const [myProjects, setMyProjects] = useState([])
  const [joinedProjects, setJoinedProjects] = useState([])
  const [invitations, setInvitations] = useState([])
  const [requestsReceived, setRequestsReceived] = useState([])
  const [requestsSent, setRequestsSent] = useState([])

  const [loading, setLoading] = useState(true)

  const [formModal, setFormModal] = useState(null) // null | 'create' | project object (edit)
  const [inviteModalProject, setInviteModalProject] = useState(null)
  const [deleteModalProject, setDeleteModalProject] = useState(null)

  const loadTabData = useCallback(async (activeTab) => {
    setLoading(true)
    try {
      if (activeTab === 'my') {
        setMyProjects(await apiRequest('/projects/my'))
      } else if (activeTab === 'joined') {
        setJoinedProjects(await apiRequest('/projects/joined'))
      } else if (activeTab === 'invitations') {
        setInvitations(await apiRequest('/projects/invitations/received'))
      } else if (activeTab === 'requests') {
        const [received, sent] = await Promise.all([
          apiRequest('/projects/requests/received'),
          apiRequest('/projects/requests/sent'),
        ])
        setRequestsReceived(received)
        setRequestsSent(sent)
      }
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTabData(tab)
  }, [tab, loadTabData])

  const handleRespondInvitation = async (id, action) => {
    try {
      await apiRequest(`/projects/invitations/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      toast.success(action === 'accept' ? 'Invitation accepted' : 'Invitation declined')
      loadTabData('invitations')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRespondRequest = async (id, action) => {
    try {
      await apiRequest(`/projects/requests/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined')
      loadTabData('requests')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleLeave = async (project) => {
    try {
      await apiRequest(`/projects/${project.id}/leave`, { method: 'POST' })
      toast.success(`Left ${project.title}`)
      loadTabData('joined')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <FolderKanban size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Projects
            </h1>
            <p className="text-xs text-slate-500 -mt-0.5">Manage your teams and collaborations</p>
          </div>
        </div>
        <button
          onClick={() => setFormModal('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* My Projects */}
      {tab === 'my' && (
        <Section loading={loading} empty={myProjects.length === 0} emptyIcon={FolderKanban} emptyText="You haven't created any projects yet. Start one to find teammates.">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {myProjects.map(p => (
              <MyProjectCard
                key={p.id}
                project={p}
                onEdit={setFormModal}
                onDelete={setDeleteModalProject}
                onInvite={setInviteModalProject}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Joined Projects */}
      {tab === 'joined' && (
        <Section loading={loading} empty={joinedProjects.length === 0} emptyIcon={Users} emptyText="You haven't joined any projects yet. Explore Discover to find one.">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {joinedProjects.map(p => (
              <JoinedProjectCard key={p.id} project={p} onLeave={handleLeave} />
            ))}
          </div>
        </Section>
      )}

      {/* Invitations */}
      {tab === 'invitations' && (
        <Section loading={loading} empty={invitations.length === 0} emptyIcon={Mail} emptyText="No pending invitations right now.">
          <div className="space-y-3">
            {invitations.map(inv => (
              <InvitationCard key={inv.id} invitation={inv} onRespond={handleRespondInvitation} />
            ))}
          </div>
        </Section>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4">
            <button
              onClick={() => setRequestsSubTab('received')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                requestsSubTab === 'received' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Inbox size={13} /> Received
            </button>
            <button
              onClick={() => setRequestsSubTab('sent')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                requestsSubTab === 'sent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Send size={13} /> Sent
            </button>
          </div>

          {requestsSubTab === 'received' ? (
            <Section loading={loading} empty={requestsReceived.length === 0} emptyIcon={Inbox} emptyText="No one has requested to join your projects yet.">
              <div className="space-y-3">
                {requestsReceived.map(r => (
                  <ReceivedRequestCard key={r.id} request={r} onRespond={handleRespondRequest} />
                ))}
              </div>
            </Section>
          ) : (
            <Section loading={loading} empty={requestsSent.length === 0} emptyIcon={Send} emptyText="You haven't requested to join any projects yet.">
              <div className="space-y-2">
                {requestsSent.map(r => (
                  <SentRequestCard key={r.id} request={r} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Modals */}
      {formModal && (
        <ProjectFormModal
          project={formModal === 'create' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={() => { setFormModal(null); loadTabData('my') }}
        />
      )}
      {inviteModalProject && (
        <InviteModal project={inviteModalProject} onClose={() => setInviteModalProject(null)} />
      )}
      {deleteModalProject && (
        <ConfirmDeleteModal
          project={deleteModalProject}
          onClose={() => setDeleteModalProject(null)}
          onConfirmed={() => { setDeleteModalProject(null); loadTabData('my') }}
        />
      )}
    </div>
  )
}
