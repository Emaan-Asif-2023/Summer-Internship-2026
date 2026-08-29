import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import {
  Search, Plus, Users, FolderSearch, Mail,
  ArrowRight, MapPin, Star, Clock, UserPlus,
  Zap, Award, Sparkles, Handshake
} from 'lucide-react'

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`

const getHeaders = () => {
  const token = localStorage.getItem('ts_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const QUICK_ACTIONS = [
  {
    label: 'Create Project',
    descKey: 'projects',
    desc: 'Start a new team project',
    icon: Plus,
    to: '/projects?create=true',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    label: 'Browse Teams',
    desc: 'Find teams to join',
    icon: Users,
    to: '/discover?type=students',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    label: 'Find Teammates',
    desc: 'Discover skilled students',
    icon: Search,
    to: '/discover?type=students',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    label: 'My Invitations',
    descKey: 'invitations',
    desc: 'Pending invites',
    icon: Mail,
    to: '/notifications',
    gradient: 'from-rose-500 to-pink-500',
  },
]

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

const STATUS_CONFIG = {
  Recruiting: 'bg-emerald-100 text-emerald-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-slate-100 text-slate-600',
}

const STAT_CARDS = [
  { key: 'projects_joined', label: 'Projects Joined', icon: FolderSearch, color: 'bg-indigo-50 text-indigo-600', to: '/projects' },
  { key: 'teammates', label: 'Connections', icon: Users, color: 'bg-emerald-50 text-emerald-600', to: '/notifications?tab=connections' },
  { key: 'messages', label: 'Messages', icon: Mail, color: 'bg-amber-50 text-amber-600', to: '/chats' },
]

// ── Helpers ────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function MatchBadge({ percent }) {
  const color =
    percent >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    percent >= 80 ? 'bg-blue-100 text-blue-700 border-blue-200' :
    percent >= 70 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {percent}% match
    </span>
  )
}

function ReasonIcon({ type, size = 13 }) {
  switch (type) {
    case 'shared_skills':
      return <Zap size={size} className="text-amber-500" />
    case 'same_department':
      return <MapPin size={size} className="text-indigo-500" />
    case 'same_semester':
    case 'close_semester':
      return <Clock size={size} className="text-emerald-500" />
    case 'complementary_skills':
      return <Award size={size} className="text-rose-500" />
    default:
      return <Star size={size} className="text-slate-400" />
  }
}

// ── Skeletons ──────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 mb-3" />
      <div className="w-12 h-7 rounded bg-slate-200 mb-1" />
      <div className="w-20 h-3 rounded bg-slate-100" />
    </div>
  )
}

function PartnerSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1">
          <div className="w-28 h-4 rounded bg-slate-200 mb-1.5" />
          <div className="w-36 h-3 rounded bg-slate-100" />
        </div>
        <div className="w-16 h-5 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="w-full h-4 rounded bg-slate-100" />
        <div className="w-3/4 h-4 rounded bg-slate-100" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="w-14 h-5 rounded-md bg-slate-100" />
        <div className="w-16 h-5 rounded-md bg-slate-100" />
        <div className="w-12 h-5 rounded-md bg-slate-100" />
      </div>
      <div className="w-full h-9 rounded-xl bg-slate-100" />
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="w-20 h-6 rounded-full bg-slate-200" />
        <div className="w-12 h-4 rounded bg-slate-100" />
      </div>
      <div className="w-4/5 h-4 rounded bg-slate-200 mb-2" />
      <div className="w-full h-3 rounded bg-slate-100 mb-1" />
      <div className="w-2/3 h-3 rounded bg-slate-100 mb-4 flex-1" />
      <div className="flex gap-2 mb-4">
        <div className="w-14 h-5 rounded-md bg-slate-100" />
        <div className="w-16 h-5 rounded-md bg-slate-100" />
      </div>
      <div className="h-px bg-slate-100 mb-3" />
      <div className="flex justify-between">
        <div className="w-24 h-3 rounded bg-slate-100" />
        <div className="w-16 h-3 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function SkillSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const greeting = useMemo(() => getGreeting(), [])

  const [stats, setStats] = useState(null)
  const [partners, setPartners] = useState([])
  const [projects, setProjects] = useState([])
  const [trendingSkills, setTrendingSkills] = useState([])

  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingSkills, setLoadingSkills] = useState(true)

  const [connStatus, setConnStatus] = useState({
    connected_ids: [],
    pending_sent_ids: [],
    pending_received_ids: [],
  })

  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch all data ──
  useEffect(() => {
    async function fetchAll() {
      const endpoints = [
        { url: `${API_BASE}/home/stats`, key: 'stats' },
        { url: `${API_BASE}/home/partner-recommendations`, key: 'partners' },
        { url: `${API_BASE}/home/recent-projects`, key: 'projects' },
        { url: `${API_BASE}/home/trending-skills`, key: 'skills' },
        { url: `${API_BASE}/connections/status`, key: 'conn' },
      ]

      const results = await Promise.allSettled(
        endpoints.map(ep => fetch(ep.url, { headers: getHeaders() }))
      )

      for (let i = 0; i < results.length; i++) {
        const res = results[i]
        const key = endpoints[i].key

        if (res.status === 'fulfilled' && res.value.ok) {
          try {
            const data = await res.value.json()
            switch (key) {
              case 'stats':
                setStats(data)
                break
              case 'partners':
                setPartners(data)
                break
              case 'projects':
                setProjects(data)
                break
              case 'skills':
                setTrendingSkills(data)
                break
              case 'conn':
                setConnStatus({
                  connected_ids: data.connected_ids || [],
                  pending_sent_ids: data.pending_sent_ids || [],
                  pending_received_ids: data.pending_received_ids || [],
                })
                break
            }
          } catch {
            // JSON parse error
          }
        }
      }

      setLoadingStats(false)
      setLoadingPartners(false)
      setLoadingProjects(false)
      setLoadingSkills(false)
    }

    fetchAll()
  }, [])

  // ── Connect handler ──
  const handleConnect = useCallback(async (student) => {
    try {
      const res = await fetch(`${API_BASE}/connections/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ to_user_id: student.id }),
      })
      if (res.ok) {
        toast.success(`Connection request sent to ${student.name}`, {
          icon: '🤝',
          style: { borderRadius: '12px', fontSize: '13px' },
          duration: 2500,
        })
        setConnStatus(prev => ({
          ...prev,
          pending_sent_ids: [...prev.pending_sent_ids, student.id],
        }))
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Failed to send request')
      }
    } catch {
      toast.error('Network error. Failed to send request.')
    }
  }, [])

  // ── Search ──
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/discover?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // ── Connection status helper ──
  const getConnStatus = (studentId) => {
    if (connStatus.connected_ids.includes(studentId)) return 'connected'
    if (connStatus.pending_sent_ids.includes(studentId)) return 'pending_sent'
    if (connStatus.pending_received_ids.includes(studentId)) return 'pending_received'
    return 'none'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">

      {/* ── Greeting Banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {greeting}, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-lg mb-5">
            Find the perfect teammates for your next project, or discover exciting opportunities from other students.
          </p>

          <form onSubmit={handleSearch} className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search students, projects, skills..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/15 backdrop-blur border border-white/20 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
            />
          </form>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {loadingStats
          ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          : STAT_CARDS.map(sc => (
              <button
                key={sc.key}
                onClick={() => sc.to && navigate(sc.to)}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover:shadow-card-hover hover:-translate-y-0.5 transition-all text-left w-full cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${sc.color}`}>
                  <sc.icon size={18} />
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {stats?.[sc.key] ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{sc.label}</p>
              </button>
            ))
        }
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2
          className="text-lg font-bold text-slate-800 mb-4"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {QUICK_ACTIONS.map(action => {
            let desc = action.desc
            if (action.descKey === 'invitations' && stats) {
              const count = stats.invitations ?? 0
              desc = count > 0 ? `${count} pending invite${count !== 1 ? 's' : ''}` : 'No pending invites'
            }

            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover:shadow-card-hover transition-all text-left hover:-translate-y-0.5"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${action.gradient} text-white shadow-md`}
                >
                  <action.icon size={18} />
                </div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Partner Recommendations ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h2
              className="text-lg font-bold text-slate-800"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Partner Recommendations
            </h2>
          </div>
          <button
            onClick={() => navigate('/discover?type=students')}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See All <ArrowRight size={14} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-7">
          Suggested based on your skills, department, and year
        </p>

        {loadingPartners ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <PartnerSkeleton key={i} />)}
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
            <Handshake size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No partner recommendations yet. Add skills to your profile to get matched!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {partners.map((partner, i) => {
              const status = getConnStatus(partner.id)
              const isConnected = status === 'connected'
              const isPendingSent = status === 'pending_sent'
              const isPendingReceived = status === 'pending_received'
              const isNone = status === 'none'
              const hasReasons = partner.match_reasons?.length > 0

              return (
                <div
                  key={partner.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}
                    >
                      {getInitials(partner.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">{partner.name}</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {partner.department || 'No dept'}
                        {partner.semester && partner.semester !== 'N/A' ? ` · Sem ${partner.semester}` : ''}
                      </p>
                    </div>
                    <MatchBadge percent={partner.match_score ?? 0} />
                  </div>

                  {/* Match Reasons */}
                  {hasReasons && (
                    <div className="space-y-1.5 mb-3 pb-3 border-b border-slate-50">
                      {partner.match_reasons.slice(0, 3).map((reason, ri) => (
                        <div key={ri} className="flex items-start gap-2 text-xs leading-relaxed">
                          <div className="mt-0.5 shrink-0">
                            <ReasonIcon type={reason.type} />
                          </div>
                          <span className="text-slate-500">
                            <span className="font-medium text-slate-600">{reason.label}:</span>{' '}
                            {reason.type === 'shared_skills' || reason.type === 'complementary_skills'
                              ? reason.value.join(', ')
                              : reason.value
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                    {(partner.skills || []).slice(0, 4).map(s => (
                      <span
                        key={s}
                        className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                    {(partner.skills || []).length > 4 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
                        +{partner.skills.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Connect Button */}
                  <button
                    disabled={isConnected || isPendingSent}
                    onClick={() => {
                      if (isNone) handleConnect(partner)
                      else if (isPendingReceived) navigate('/notifications')
                    }}
                    className={`w-full py-2.5 text-xs font-semibold rounded-xl transition-all ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                        : isPendingSent
                        ? 'bg-amber-50 text-amber-600 border border-amber-200 cursor-default'
                        : isPendingReceived
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 cursor-pointer'
                        : 'text-primary border border-primary/20 hover:bg-primary/5 hover:border-primary/40'
                    }`}
                  >
                    {isConnected ? '✓ Connected' : isPendingSent ? '⏳ Request Sent' : isPendingReceived ? '📥 View Request' : 'Connect'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Recent Projects ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold text-slate-800"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Recent Projects
          </h2>
          <button
            onClick={() => navigate('/discover?type=projects')}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See All <ArrowRight size={14} />
          </button>
        </div>

        {loadingProjects ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <ProjectSkeleton key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
            <FolderSearch size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No projects yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const members = project.member_count ?? 0
              const maxMembers = project.max_members ?? 5

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status] || 'bg-slate-100 text-slate-500'}`}>
                      {project.status || 'Unknown'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Users size={12} />
                      {members}/{maxMembers}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mb-1.5 break-words">
                    {project.title || project.name || 'Untitled Project'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(project.skills || []).slice(0, 3).map(s => (
                      <span
                        key={s}
                        className="text-[10px] font-medium px-2 py-0.5 bg-primary/5 text-primary rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                    {(project.skills || []).length > 3 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                        +{project.skills.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 truncate max-w-[60%]">
                      by {project.owner_name || 'Unknown'}
                    </span>
                    <button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      View <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Trending Skills ── */}
      <div>
        <h2
          className="text-lg font-bold text-slate-800 mb-4"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Trending Skills
        </h2>

        {loadingSkills ? (
          <SkillSkeleton />
        ) : trendingSkills.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
            <Star size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No skills data yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {trendingSkills.map(skill => (
                <button
                  key={skill.name}
                  onClick={() => navigate(`/discover?skill=${encodeURIComponent(skill.name)}`)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">
                    {skill.name}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{skill.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}