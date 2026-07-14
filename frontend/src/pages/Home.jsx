import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Search, Plus, Users, FolderSearch, Mail,
  ArrowRight, MapPin, Star, Clock, UserPlus,
  Zap, TrendingUp, Award
} from 'lucide-react'

// ── Mock Data ──────────────────────────────────────────────
// Replace these with real API calls when backend endpoints are ready.
// TODO: GET /api/home/stats
// TODO: GET /api/home/recommended-teammates
// TODO: GET /api/home/recent-projects
// TODO: GET /api/home/invitations

const MOCK_STATS = [
  { label: 'Projects Joined', value: '3', icon: FolderSearch, color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Teammates', value: '8', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Messages', value: '24', icon: Mail, color: 'bg-amber-50 text-amber-600' },
  { label: 'Invitations', value: '3', icon: UserPlus, color: 'bg-rose-50 text-rose-600' },
]

const QUICK_ACTIONS = [
  {
    label: 'Create Project',
    desc: 'Start a new team project',
    icon: Plus,
    to: '/projects?create=true',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    label: 'Browse Teams',
    desc: 'Find teams to join',
    icon: Users,
    to: '/discover?type=teams',
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
    desc: '3 pending invites',
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
]

const MOCK_TEAMMATES = [
  {
    name: 'Sara Ahmed',
    department: 'Computer Science',
    semester: 6,
    skills: ['React', 'Node.js', 'Python'],
    match: 95,
  },
  {
    name: 'Omar Khan',
    department: 'Software Engineering',
    semester: 8,
    skills: ['Java', 'Spring Boot', 'AWS'],
    match: 88,
  },
  {
    name: 'Fatima Ali',
    department: 'Data Science',
    semester: 4,
    skills: ['Python', 'TensorFlow', 'SQL'],
    match: 82,
  },
  {
    name: 'Hassan Raza',
    department: 'Computer Science',
    semester: 6,
    skills: ['Flutter', 'Dart', 'Firebase'],
    match: 78,
  },
  {
    name: 'Ayesha Malik',
    department: 'Information Tech',
    semester: 6,
    skills: ['UI/UX', 'Figma', 'CSS'],
    match: 75,
  },
  {
    name: 'Bilal Siddiqui',
    department: 'Computer Science',
    semester: 8,
    skills: ['MERN', 'Docker', 'K8s'],
    match: 91,
  },
]

const STATUS_CONFIG = {
  Recruiting: 'bg-emerald-100 text-emerald-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-slate-100 text-slate-600',
}

const MOCK_PROJECTS = [
  {
    title: 'AI Study Assistant',
    description: 'Building an AI-powered tool that generates study plans, summaries, and practice questions from lecture notes.',
    skills: ['Python', 'TensorFlow', 'React', 'FastAPI'],
    members: 3,
    maxMembers: 5,
    status: 'Recruiting',
    owner: 'Bilal Siddiqui',
  },
  {
    title: 'Campus Event Manager',
    description: 'A full-stack platform for managing university events with registration, ticketing, and analytics.',
    skills: ['MERN Stack', 'MongoDB', 'Tailwind'],
    members: 4,
    maxMembers: 4,
    status: 'In Progress',
    owner: 'Sara Ahmed',
  },
  {
    title: 'Smart Attendance System',
    description: 'Face recognition-based attendance system for university classes with real-time dashboards.',
    skills: ['Python', 'OpenCV', 'Flask', 'React'],
    members: 2,
    maxMembers: 4,
    status: 'Recruiting',
    owner: 'Fatima Ali',
  },
  {
    title: 'Freelance Marketplace',
    description: 'A student-to-student freelance platform for small projects, design work, and tutoring.',
    skills: ['Next.js', 'PostgreSQL', 'Stripe'],
    members: 1,
    maxMembers: 5,
    status: 'Recruiting',
    owner: 'Omar Khan',
  },
  {
    title: 'Quiz Battle App',
    description: 'Real-time multiplayer quiz app with leaderboards, categories, and social features.',
    skills: ['React Native', 'Firebase', 'Socket.io'],
    members: 5,
    maxMembers: 5,
    status: 'Completed',
    owner: 'Hassan Raza',
  },
]

const TRENDING_SKILLS = [
  { name: 'React', count: 42 },
  { name: 'Python', count: 38 },
  { name: 'Node.js', count: 31 },
  { name: 'TypeScript', count: 27 },
  { name: 'Flutter', count: 22 },
  { name: 'MongoDB', count: 19 },
  { name: 'AWS', count: 16 },
  { name: 'Figma', count: 14 },
]

// ── Helpers ────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function MatchBadge({ percent }) {
  const color =
    percent >= 90 ? 'bg-emerald-100 text-emerald-700' :
    percent >= 80 ? 'bg-blue-100 text-blue-700' :
    percent >= 70 ? 'bg-amber-100 text-amber-700' :
    'bg-slate-100 text-slate-600'

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {percent}% match
    </span>
  )
}

// ── Component ──────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const greeting = useMemo(() => getGreeting(), [])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">

      {/* ── Greeting Banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)' }}
      >
        {/* Decorative circles */}
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

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students, projects, skills..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/15 backdrop-blur border border-white/20 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {MOCK_STATS.map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 hover:shadow-card-hover transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
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
          {QUICK_ACTIONS.map(action => (
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
              <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recommended Teammates ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold text-slate-800"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Recommended Teammates
          </h2>
          <button
            onClick={() => navigate('/discover?type=students')}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See All <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {MOCK_TEAMMATES.map((mate, i) => (
            <div
              key={mate.name}
              className="snap-start shrink-0 w-64 bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5"
            >
              {/* Avatar + match */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
                >
                  {getInitials(mate.name)}
                </div>
                <MatchBadge percent={mate.match} />
              </div>

              <h3 className="text-sm font-semibold text-slate-800">{mate.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={11} />
                {mate.department} · Sem {mate.semester}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {mate.skills.map(s => (
                  <span
                    key={s}
                    className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <button className="w-full mt-4 py-2 text-xs font-semibold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                Connect
              </button>
            </div>
          ))}
        </div>
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_PROJECTS.map(project => (
            <div
              key={project.title}
              className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col"
            >
              {/* Status + members */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status]}`}>
                  {project.status}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Users size={12} />
                  {project.members}/{project.maxMembers}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-1.5">{project.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                {project.description}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {project.skills.slice(0, 3).map(s => (
                  <span
                    key={s}
                    className="text-[10px] font-medium px-2 py-0.5 bg-primary/5 text-primary rounded-md"
                  >
                    {s}
                  </span>
                ))}
                {project.skills.length > 3 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                    +{project.skills.length - 3}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">by {project.owner}</span>
                <button
                  onClick={() => navigate('/projects')}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  View <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trending Skills ── */}
      <div>
        <h2
          className="text-lg font-bold text-slate-800 mb-4"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Trending Skills
        </h2>
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRENDING_SKILLS.map((skill, i) => (
              <button
                key={skill.name}
                onClick={() => navigate(`/discover?skill=${skill.name}`)}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">
                    {skill.name}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{skill.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Getting Started (for new users) ── */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
            <Zap size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3
              className="text-base font-bold text-slate-800 mb-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Get the most out of TeamSync
            </h3>
            <p className="text-sm text-slate-500">
              Complete your profile with skills and interests to get better teammate recommendations and project matches.
            </p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="shrink-0 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            Complete Profile
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}