// import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
// import { useSearchParams, useNavigate } from 'react-router-dom'
// import { useAuth } from '../context/AuthContext.jsx'
// import toast from 'react-hot-toast'
// import {
//   Search, Users, FolderSearch, SlidersHorizontal, X,
//   ChevronDown, ArrowLeft, ArrowRight, UserPlus,
//   MapPin, Star, Clock, CheckCircle2, Sparkles,
//   Filter, RotateCcw
// } from 'lucide-react'

// const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'


// const getHeaders = () => {
//   const token = localStorage.getItem('token') || localStorage.getItem('access_token')
//   return {
//     'Content-Type': 'application/json',
//     ...(token ? { Authorization: 'Bearer ' + token } : {}),
//   }
// }


// // ── Static filter options (used as fallback, overridden by /meta) ──
// const DEFAULT_DEPARTMENTS = [
//   'Computer Science', 'Software Engineering', 'Data Science',
//   'Information Technology', 'Computer Engineering', 'Cybersecurity',
//   'Artificial Intelligence', 'Electrical Engineering',
// ]

// const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]

// const DEFAULT_SKILLS = [
//   'React', 'Python', 'Node.js', 'TypeScript', 'Flutter',
//   'MongoDB', 'AWS', 'Figma', 'Java', 'Spring Boot',
//   'TensorFlow', 'FastAPI', 'Docker', 'Next.js', 'SQL',
//   'OpenCV', 'Socket.io', 'Tailwind CSS', 'React Native', 'Kubernetes',
// ]

// const SORT_OPTIONS = {
//   students: [
//     { value: 'relevance', label: 'Best Match' },
//     { value: 'name_asc', label: 'Name A-Z' },
//     { value: 'name_desc', label: 'Name Z-A' },
//     { value: 'semester_asc', label: 'Semester (Asc)' },
//     { value: 'semester_desc', label: 'Semester (Desc)' },
//   ],
//   projects: [
//     { value: 'newest', label: 'Newest First' },
//     { value: 'relevance', label: 'Most Relevant' },
//     { value: 'members_asc', label: 'Fewest Members' },
//     { value: 'members_desc', label: 'Most Members' },
//   ],
// }

// const PROJECT_STATUSES = ['Recruiting', 'In Progress', 'Completed']

// const STATUS_CONFIG = {
//   Recruiting: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
//   'In Progress': 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
//   Completed: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
// }

// const AVATAR_COLORS = [
//   'from-indigo-400 to-purple-500',
//   'from-emerald-400 to-teal-500',
//   'from-amber-400 to-orange-500',
//   'from-rose-400 to-pink-500',
//   'from-cyan-400 to-blue-500',
//   'from-violet-400 to-fuchsia-500',
//   'from-lime-400 to-green-500',
//   'from-sky-400 to-indigo-500',
// ]

// const MOCK_STUDENTS = [
//   { id: '1', name: 'Sara Ahmed', department: 'Computer Science', semester: 6, skills: ['React', 'Node.js', 'Python'], match_score: 95 },
//   { id: '2', name: 'Omar Khan', department: 'Software Engineering', semester: 8, skills: ['Java', 'Spring Boot', 'AWS'], match_score: 88 },
//   { id: '3', name: 'Fatima Ali', department: 'Data Science', semester: 4, skills: ['Python', 'TensorFlow', 'SQL'], match_score: 82 },
//   { id: '4', name: 'Hassan Raza', department: 'Computer Science', semester: 6, skills: ['Flutter', 'Dart', 'Firebase'], match_score: 78 },
//   { id: '5', name: 'Ayesha Malik', department: 'Information Technology', semester: 6, skills: ['UI/UX', 'Figma', 'CSS'], match_score: 75 },
//   { id: '6', name: 'Bilal Siddiqui', department: 'Computer Science', semester: 8, skills: ['MERN', 'Docker', 'K8s'], match_score: 91 },
//   { id: '7', name: 'Zainab Noor', department: 'Software Engineering', semester: 5, skills: ['React', 'TypeScript', 'Tailwind CSS'], match_score: 85 },
//   { id: '8', name: 'Ali Husnain', department: 'Computer Engineering', semester: 7, skills: ['Python', 'OpenCV', 'C++'], match_score: 70 },
//   { id: '9', name: 'Maryam Tariq', department: 'Data Science', semester: 6, skills: ['Python', 'SQL', 'Tableau'], match_score: 80 },
//   { id: '10', name: 'Usman Sheikh', department: 'Cybersecurity', semester: 8, skills: ['Python', 'Kali Linux', 'Networking'], match_score: 65 },
//   { id: '11', name: 'Hira Bashir', department: 'Computer Science', semester: 4, skills: ['React Native', 'Firebase', 'JavaScript'], match_score: 73 },
//   { id: '12', name: 'Tahir Mehmood', department: 'Software Engineering', semester: 6, skills: ['Next.js', 'PostgreSQL', 'Prisma'], match_score: 86 },
// ]

// const MOCK_PROJECTS = [
//   { id: 'p1', title: 'AI Study Assistant', description: 'Building an AI-powered tool that generates study plans, summaries, and practice questions from lecture notes.', skills: ['Python', 'TensorFlow', 'React', 'FastAPI'], member_count: 3, max_members: 5, status: 'Recruiting', owner_id: '6', created_at: '2025-01-10' },
//   { id: 'p2', title: 'Campus Event Manager', description: 'A full-stack platform for managing university events with registration, ticketing, and analytics.', skills: ['MERN Stack', 'MongoDB', 'Tailwind'], member_count: 4, max_members: 4, status: 'In Progress', owner_id: '1', created_at: '2024-12-20' },
//   { id: 'p3', title: 'Smart Attendance System', description: 'Face recognition-based attendance system for university classes with real-time dashboards.', skills: ['Python', 'OpenCV', 'Flask', 'React'], member_count: 2, max_members: 4, status: 'Recruiting', owner_id: '3', created_at: '2025-01-05' },
//   { id: 'p4', title: 'Freelance Marketplace', description: 'A student-to-student freelance platform for small projects, design work, and tutoring.', skills: ['Next.js', 'PostgreSQL', 'Stripe'], member_count: 1, max_members: 5, status: 'Recruiting', owner_id: '2', created_at: '2025-01-12' },
//   { id: 'p5', title: 'Quiz Battle App', description: 'Real-time multiplayer quiz app with leaderboards, categories, and social features.', skills: ['React Native', 'Firebase', 'Socket.io'], member_count: 5, max_members: 5, status: 'Completed', owner_id: '4', created_at: '2024-11-15' },
//   { id: 'p6', title: 'Budget Tracker', description: 'Personal finance app with expense categorization, monthly reports, and savings goals.', skills: ['React', 'Node.js', 'MongoDB'], member_count: 2, max_members: 3, status: 'Recruiting', owner_id: '7', created_at: '2025-01-14' },
//   { id: 'p7', title: 'Library Management System', description: 'Digital library system with book cataloging, issue/return tracking, and fine calculation.', skills: ['Java', 'Spring Boot', 'MySQL'], member_count: 3, max_members: 4, status: 'In Progress', owner_id: '2', created_at: '2024-12-01' },
//   { id: 'p8', title: 'Recipe Sharing Platform', description: 'Social platform where students share recipes with photos, ratings, and ingredient scaling.', skills: ['Next.js', 'Firebase', 'Tailwind CSS'], member_count: 2, max_members: 4, status: 'Recruiting', owner_id: '12', created_at: '2025-01-08' },
//   { id: 'p9', title: 'Parking Slot Finder', description: 'IoT-integrated app showing real-time parking availability across campus with navigation.', skills: ['Flutter', 'Firebase', 'Arduino'], member_count: 1, max_members: 4, status: 'Recruiting', owner_id: '4', created_at: '2025-01-13' },
// ]

// function getInitials(name) {
//   return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
// }

// function MatchBadge({ percent }) {
//   const color =
//     percent >= 90 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
//     percent >= 80 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
//     percent >= 70 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
//     'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
//   return (
//     <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
//       {percent}% match
//     </span>
//   )
// }

// function buildQuery(params) {
//   const q = new URLSearchParams()
//   Object.entries(params).forEach(([k, v]) => {
//     if (v !== undefined && v !== null && v !== '') {
//       if (Array.isArray(v)) v.forEach(item => q.append(k, item))
//       else q.set(k, v)
//     }
//   })
//   return q.toString()
// }

// function SkeletonCard() {
//   return (
//     <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
//       <div className="flex items-start justify-between mb-4">
//         <div className="w-12 h-12 rounded-full bg-slate-200" />
//         <div className="w-16 h-5 rounded-full bg-slate-200" />
//       </div>
//       <div className="w-3/4 h-4 rounded bg-slate-200 mb-2" />
//       <div className="w-1/2 h-3 rounded bg-slate-100 mb-4" />
//       <div className="flex gap-2 mb-4">
//         <div className="w-14 h-5 rounded-md bg-slate-100" />
//         <div className="w-16 h-5 rounded-md bg-slate-100" />
//         <div className="w-12 h-5 rounded-md bg-slate-100" />
//       </div>
//       <div className="w-full h-8 rounded-xl bg-slate-100" />
//     </div>
//   )
// }

// function SkeletonProjectCard() {
//   return (
//     <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse flex flex-col">
//       <div className="flex items-center justify-between mb-3">
//         <div className="w-20 h-6 rounded-full bg-slate-200" />
//         <div className="w-12 h-4 rounded bg-slate-100" />
//       </div>
//       <div className="w-4/5 h-4 rounded bg-slate-200 mb-2" />
//       <div className="w-full h-3 rounded bg-slate-100 mb-1" />
//       <div className="w-2/3 h-3 rounded bg-slate-100 mb-4 flex-1" />
//       <div className="flex gap-2 mb-4">
//         <div className="w-14 h-5 rounded-md bg-slate-100" />
//         <div className="w-16 h-5 rounded-md bg-slate-100" />
//         <div className="w-12 h-5 rounded-md bg-slate-100" />
//       </div>
//       <div className="h-px bg-slate-100 mb-3" />
//       <div className="flex justify-between">
//         <div className="w-24 h-3 rounded bg-slate-100" />
//         <div className="w-16 h-3 rounded bg-slate-100" />
//       </div>
//     </div>
//   )
// }

// function EmptyState({ type, hasFilters }) {
//   return (
//     <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
//       <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
//         {hasFilters ? (
//           <SlidersHorizontal size={28} className="text-slate-400" />
//         ) : type === 'students' ? (
//           <Users size={28} className="text-slate-400" />
//         ) : (
//           <FolderSearch size={28} className="text-slate-400" />
//         )}
//       </div>
//       <h3 className="text-base font-semibold text-slate-700 mb-1">
//         {hasFilters ? 'No results match your filters' : `No ${type} found`}
//       </h3>
//       <p className="text-sm text-slate-400 max-w-xs text-center">
//         {hasFilters
//           ? 'Try adjusting your search or removing some filters.'
//           : type === 'students'
//             ? 'Check back later as more students join TeamSync.'
//             : 'Be the first to create a project!'}
//       </p>
//     </div>
//   )
// }

// function StudentCard({ student, onConnect, connectedIds }) {
//   const colorIdx = (student.name || '').length % AVATAR_COLORS.length
//   const isConnected = connectedIds.has(student.id)
//   const match = student.match_score ?? 0

//   return (
//     <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col">
//       <div className="flex items-start justify-between mb-3">
//         <div
//           className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}
//         >
//           {getInitials(student.name)}
//         </div>
//         <MatchBadge percent={match} />
//       </div>

//       <h3 className="text-sm font-semibold text-slate-800 truncate">{student.name}</h3>
//       <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
//         <MapPin size={11} className="shrink-0" />
//         <span className="truncate">{student.department} · Sem {student.semester}</span>
//       </p>

//       <div className="flex flex-wrap gap-1.5 mt-3 flex-1">
//         {(student.skills || []).slice(0, 4).map(s => (
//           <span
//             key={s}
//             className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
//           >
//             {s}
//           </span>
//         ))}
//         {(student.skills || []).length > 4 && (
//           <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
//             +{student.skills.length - 4}
//           </span>
//         )}
//       </div>

//       <button
//         disabled={isConnected}
//         onClick={() => onConnect(student)}
//         className={`w-full mt-4 py-2 text-xs font-semibold rounded-xl transition-all ${
//           isConnected
//             ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
//             : 'text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-[0.98]'
//         }`}
//       >
//         {isConnected ? (
//           <span className="flex items-center justify-center gap-1">
//             <CheckCircle2 size={13} /> Request Sent
//           </span>
//         ) : (
//           <span className="flex items-center justify-center gap-1">
//             <UserPlus size={13} /> Connect
//           </span>
//         )}
//       </button>
//     </div>
//   )
// }

// function ProjectCard({ project }) {
//   const navigate = useNavigate()
//   const members = project.member_count ?? project.members ?? 0
//   const maxMembers = project.max_members ?? 5

//   return (
//     <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col">
//       <div className="flex items-center justify-between mb-3">
//         <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status] || 'bg-slate-100 text-slate-500'}`}>
//           {project.status}
//         </span>
//         <span className="text-xs text-slate-500 flex items-center gap-1">
//           <Users size={12} />
//           {members}/{maxMembers}
//         </span>
//       </div>

//       <h3 className="text-sm font-bold text-slate-800 mb-1.5">{project.title}</h3>
//       <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
//         {project.description}
//       </p>

//       <div className="flex flex-wrap gap-1.5 mb-4">
//         {(project.skills || []).slice(0, 3).map(s => (
//           <span
//             key={s}
//             className="text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md"
//           >
//             {s}
//           </span>
//         ))}
//         {(project.skills || []).length > 3 && (
//           <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
//             +{project.skills.length - 3}
//           </span>
//         )}
//       </div>

//       <div className="flex items-center justify-between pt-3 border-t border-slate-100">
//         <span className="text-xs text-slate-400">
//           {project.owner_name || `by ${project.owner_id?.slice(0, 8) || 'Unknown'}`}
//         </span>
//         <button
//           onClick={() => navigate(`/projects/${project.id}`)}
//           className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 transition-colors"
//         >
//           View <ArrowRight size={12} />
//         </button>
//       </div>
//     </div>
//   )
// }

// function FilterSelect({ value, onChange, options, placeholder, icon: Icon }) {
//   const [open, setOpen] = useState(false)
//   const ref = useRef(null)

//   useEffect(() => {
//     function handleClick(e) {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false)
//     }
//     document.addEventListener('mousedown', handleClick)
//     return () => document.removeEventListener('mousedown', handleClick)
//   }, [])

//   const selectedLabel = options.find(o => String(o.value) === String(value))?.label || placeholder

//   return (
//     <div ref={ref} className="relative">
//       <button
//         onClick={() => setOpen(!open)}
//         className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
//           value
//             ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700'
//             : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
//         }`}
//       >
//         {Icon && <Icon size={14} />}
//         <span className="max-w-[120px] truncate">{selectedLabel}</span>
//         <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
//       </button>
//       {open && (
//         <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-30 py-1 max-h-60 overflow-y-auto">
//           <button
//             onClick={() => { onChange(''); setOpen(false) }}
//             className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${!value ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
//           >
//             All
//           </button>
//           {options.map(opt => (
//             <button
//               key={opt.value}
//               onClick={() => { onChange(opt.value); setOpen(false) }}
//               className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${String(opt.value) === String(value) ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
//             >
//               {opt.label}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }

// function Pagination({ page, pages, onPageChange }) {
//   if (pages <= 1) return null
//   const nums = []
//   for (let i = 1; i <= pages; i++) {
//     if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
//       nums.push(i)
//     } else if (nums[nums.length - 1] !== '...') {
//       nums.push('...')
//     }
//   }
//   return (
//     <div className="flex items-center justify-center gap-1.5 pt-6">
//       <button
//         disabled={page <= 1}
//         onClick={() => onPageChange(page - 1)}
//         className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
//       >
//         <ArrowLeft size={14} />
//       </button>
//       {nums.map((n, i) =>
//         n === '...' ? (
//           <span key={`dot-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
//         ) : (
//           <button
//             key={n}
//             onClick={() => onPageChange(n)}
//             className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
//               n === page
//                 ? 'bg-indigo-600 text-white shadow-sm'
//                 : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
//             }`}
//           >
//             {n}
//           </button>
//         )
//       )}
//       <button
//         disabled={page >= pages}
//         onClick={() => onPageChange(page + 1)}
//         className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
//       >
//         <ArrowRight size={14} />
//       </button>
//     </div>
//   )
// }


// export default function Discover() {
//   const { user } = useAuth()
//   const [searchParams, setSearchParams] = useSearchParams()
//   const navigate = useNavigate()

//   const type = searchParams.get('type') || 'students'

//   const [search, setSearch] = useState('')
//   const [debouncedSearch, setDebouncedSearch] = useState('')
//   const [department, setDepartment] = useState('')
//   const [semester, setSemester] = useState('')
//   const [selectedSkills, setSelectedSkills] = useState([])
//   const [status, setStatus] = useState('')
//   const [sort, setSort] = useState('relevance')
//   const [page, setPage] = useState(1)

//   const [results, setResults] = useState([])
//   const [total, setTotal] = useState(0)
//   const [pages, setPages] = useState(1)
//   const [loading, setLoading] = useState(true)
//   const [connectedIds, setConnectedIds] = useState(new Set())

//   const [meta, setMeta] = useState({ departments: DEFAULT_DEPARTMENTS, semesters: DEFAULT_SEMESTERS, skills: DEFAULT_SKILLS })

//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedSearch(search), 350)
//     return () => clearTimeout(t)
//   }, [search])

//   const handleTabChange = (newType) => {
//     setSearchParams({ type: newType })
//     setSearch('')
//     setDepartment('')
//     setSemester('')
//     setSelectedSkills([])
//     setStatus('')
//     setSort('relevance')
//     setPage(1)
//   }


//   useEffect(() => {
//     setPage(1)
//   }, [debouncedSearch, department, semester, selectedSkills, status, sort])

//   useEffect(() => {
//     async function fetchMeta() {
//       try {
//         const res = await fetch(`${API_BASE}/discover/meta`, { headers: getHeaders() })
//         if (res.ok) {
//           const data = await res.json()
//           if (data.departments?.length) setMeta(prev => ({ ...prev, departments: data.departments }))
//           if (data.semesters?.length) setMeta(prev => ({ ...prev, semesters: data.semesters }))
//           if (data.skills?.length) setMeta(prev => ({ ...prev, skills: data.skills }))
//         }
//       } catch {
        
//       }
//     }
//     fetchMeta()
//   }, [])

  
//   const fetchData = useCallback(async () => {
//     setLoading(true)
//     let data = null

//     try {
//       const params = {
//         search: debouncedSearch || undefined,
//         page,
//         limit: 12,
//         sort: sort || undefined,
//       }
//       if (type === 'students') {
//         params.department = department || undefined
//         params.semester = semester || undefined
//         if (selectedSkills.length) params.skills = selectedSkills
//       } else {
//         params.status = status || undefined
//         if (selectedSkills.length) params.skills = selectedSkills
//       }

//       const qs = buildQuery(params)
//       const res = await fetch(`${API_BASE}/discover/${type}?${qs}`, { headers: getHeaders() })
//       if (res.ok) {
//         data = await res.json()
//       }
//     } catch {

//     }

//     if (data && data.results) {
//       setResults(data.results)
//       setTotal(data.total)
//       setPages(data.pages)
//     } else {
//       // ── Mock fallback ──
//       let mock = type === 'students' ? [...MOCK_STUDENTS] : [...MOCK_PROJECTS]

//       // Apply client-side filters
//       if (debouncedSearch) {
//         const q = debouncedSearch.toLowerCase()
//         mock = mock.filter(item => {
//           const haystack = type === 'students'
//             ? `${item.name} ${item.department} ${(item.skills || []).join(' ')}`
//             : `${item.title} ${item.description} ${(item.skills || []).join(' ')}`
//           return haystack.toLowerCase().includes(q)
//         })
//       }
//       if (type === 'students') {
//         if (department) mock = mock.filter(s => s.department === department)
//         if (semester) mock = mock.filter(s => s.semester === semester)
//       } else {
//         if (status) mock = mock.filter(p => p.status === status)
//       }
//       if (selectedSkills.length) {
//         mock = mock.filter(item => {
//           const itemSkills = (item.skills || []).map(s => s.toLowerCase())
//           return selectedSkills.every(sk => itemSkills.some(is => is.includes(sk.toLowerCase())))
//         })
//       }

//       // Sort
//       if (type === 'students') {
//         if (sort === 'relevance') mock.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
//         else if (sort === 'name_asc') mock.sort((a, b) => a.name.localeCompare(b.name))
//         else if (sort === 'name_desc') mock.sort((a, b) => b.name.localeCompare(a.name))
//         else if (sort === 'semester_asc') mock.sort((a, b) => a.semester - b.semester)
//         else if (sort === 'semester_desc') mock.sort((a, b) => b.semester - a.semester)
//       } else {
//         if (sort === 'newest') mock.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
//         else if (sort === 'members_asc') mock.sort((a, b) => (a.member_count || 0) - (b.member_count || 0))
//         else if (sort === 'members_desc') mock.sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
//       }

//       const totalPages = Math.max(1, Math.ceil(mock.length / 12))
//       const start = (page - 1) * 12
//       setResults(mock.slice(start, start + 12))
//       setTotal(mock.length)
//       setPages(totalPages)
//     }

//     setLoading(false)
//   }, [type, debouncedSearch, department, semester, selectedSkills, status, sort, page])

//   useEffect(() => {
//     fetchData()
//   }, [fetchData])

//   // Connect handler
//   const handleConnect = (student) => {
//     setConnectedIds(prev => new Set([...prev, student.id]))
//     toast.success(`Connection request sent to ${student.name}`, {
//       icon: '🤝',
//       style: { borderRadius: '12px', fontSize: '13px' },
//       duration: 2500,
//     })
//     // TODO: POST /api/connections/request  { to_user_id: student.id }
//   }

//   // Toggle skill chip
//   const toggleSkill = (skill) => {
//     setSelectedSkills(prev =>
//       prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
//     )
//   }

//   const hasFilters = debouncedSearch || department || semester || selectedSkills.length || status
//   const clearFilters = () => {
//     setSearch('')
//     setDepartment('')
//     setSemester('')
//     setSelectedSkills([])
//     setStatus('')
//     setSort('relevance')
//   }

//   const deptOptions = meta.departments.map(d => ({ value: d, label: d }))
//   const semOptions = meta.semesters.map(s => ({ value: s, label: `Semester ${s}` }))
//   const sortOptions = SORT_OPTIONS[type] || []

//   return (
//     <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

//       {/* ── Header ── */}
//       <div className="mb-6">
//         <div className="flex items-center gap-3 mb-1">
//           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
//             <Sparkles size={18} />
//           </div>
//           <div>
//             <h1
//               className="text-xl sm:text-2xl font-bold text-slate-800"
//               style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
//             >
//               Discover
//             </h1>
//             <p className="text-xs text-slate-500 -mt-0.5">
//               Find your perfect {type === 'students' ? 'teammates' : 'projects'}
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* ── Tabs ── */}
//       <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
//         {[
//           { key: 'students', label: 'Students', icon: Users },
//           { key: 'projects', label: 'Projects', icon: FolderSearch },
//         ].map(tab => (
//           <button
//             key={tab.key}
//             onClick={() => handleTabChange(tab.key)}
//             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
//               type === tab.key
//                 ? 'bg-white text-slate-800 shadow-sm'
//                 : 'text-slate-500 hover:text-slate-700'
//             }`}
//           >
//             <tab.icon size={15} />
//             {tab.label}
//           </button>
//         ))}
//       </div>

//       {/* ── Search Bar ── */}
//       <div className="relative mb-4">
//         <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//         <input
//           type="text"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           placeholder={
//             type === 'students'
//               ? 'Search by name, skill, department...'
//               : 'Search by title, skill, description...'
//           }
//           className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
//         />
//         {search && (
//           <button
//             onClick={() => setSearch('')}
//             className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
//           >
//             <X size={13} />
//           </button>
//         )}
//       </div>

//       {/* ── Filter Row ── */}
//       <div className="flex flex-wrap items-center gap-2 mb-3">
//         <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
//           <Filter size={13} />
//           <span className="font-medium">Filters</span>
//         </div>

//         {type === 'students' && (
//           <>
//             <FilterSelect
//               value={department}
//               onChange={setDepartment}
//               options={deptOptions}
//               placeholder="Department"
//               icon={MapPin}
//             />
//             <FilterSelect
//               value={semester}
//               onChange={setSemester}
//               options={semOptions}
//               placeholder="Semester"
//               icon={Clock}
//             />
//           </>
//         )}

//         {type === 'projects' && (
//           <FilterSelect
//             value={status}
//             onChange={setStatus}
//             options={PROJECT_STATUSES.map(s => ({ value: s, label: s }))}
//             placeholder="Status"
//             icon={Clock}
//           />
//         )}

//         <FilterSelect
//           value={sort}
//           onChange={setSort}
//           options={sortOptions}
//           placeholder="Sort by"
//           icon={Star}
//         />

//         {hasFilters && (
//           <button
//             onClick={clearFilters}
//             className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-all"
//           >
//             <RotateCcw size={12} />
//             Clear
//           </button>
//         )}
//       </div>

//       {/* ── Skills Chips ── */}
//       <div className="flex flex-wrap gap-1.5 mb-5">
//         {meta.skills.map(skill => {
//           const active = selectedSkills.includes(skill)
//           return (
//             <button
//               key={skill}
//               onClick={() => toggleSkill(skill)}
//               className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${
//                 active
//                   ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
//                   : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
//               }`}
//             >
//               {skill}
//             </button>
//           )
//         })}
//       </div>

//       {/* ── Active Skill Pills ── */}
//       {selectedSkills.length > 0 && (
//         <div className="flex flex-wrap items-center gap-1.5 mb-4">
//           <span className="text-[11px] text-slate-400 font-medium">Skills:</span>
//           {selectedSkills.map(skill => (
//             <span
//               key={skill}
//               className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md"
//             >
//               {skill}
//               <button onClick={() => toggleSkill(skill)} className="hover:text-indigo-900">
//                 <X size={10} />
//               </button>
//             </span>
//           ))}
//         </div>
//       )}

//       {/* ── Results Count ── */}
//       {!loading && (
//         <p className="text-xs text-slate-400 mb-4">
//           Showing {results.length} of {total} {type}
//         </p>
//       )}

//       {/* ── Results Grid ── */}
//       {loading ? (
//         <div className={`grid gap-4 ${type === 'students' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
//           {Array.from({ length: 8 }).map((_, i) =>
//             type === 'students' ? <SkeletonCard key={i} /> : <SkeletonProjectCard key={i} />
//           )}
//         </div>
//       ) : results.length === 0 ? (
//         <EmptyState type={type} hasFilters={!!hasFilters} />
//       ) : (
//         <>
//           <div className={`grid gap-4 ${type === 'students' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
//             {type === 'students'
//               ? results.map(s => <StudentCard key={s.id} student={s} onConnect={handleConnect} connectedIds={connectedIds} />)
//               : results.map(p => <ProjectCard key={p.id} project={p} />)
//             }
//           </div>
//           <Pagination page={page} pages={pages} onPageChange={setPage} />
//         </>
//       )}
//     </div>
//   )
// }
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import {
  Search, Users, FolderSearch, SlidersHorizontal, X,
  ChevronDown, ArrowLeft, ArrowRight, UserPlus,
  MapPin, Star, Clock, CheckCircle2, Sparkles,
  Filter, RotateCcw
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const getHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const SORT_OPTIONS = {
  students: [
    { value: 'relevance', label: 'Best Match' },
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'semester_asc', label: 'Semester (Asc)' },
    { value: 'semester_desc', label: 'Semester (Desc)' },
  ],
  projects: [
    { value: 'newest', label: 'Newest First' },
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'members_asc', label: 'Fewest Members' },
    { value: 'members_desc', label: 'Most Members' },
  ],
}

const PROJECT_STATUSES = ['Recruiting', 'In Progress', 'Completed']

const STATUS_CONFIG = {
  Recruiting: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  'In Progress': 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  Completed: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
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

function MatchBadge({ percent }) {
  const color =
    percent >= 90 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
    percent >= 80 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
    percent >= 70 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
    'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {percent}% match
    </span>
  )
}

function buildQuery(params) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      if (Array.isArray(v)) v.forEach(item => q.append(k, item))
      else q.set(k, v)
    }
  })
  return q.toString()
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-full bg-slate-200" />
        <div className="w-16 h-5 rounded-full bg-slate-200" />
      </div>
      <div className="w-3/4 h-4 rounded bg-slate-200 mb-2" />
      <div className="w-1/2 h-3 rounded bg-slate-100 mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="w-14 h-5 rounded-md bg-slate-100" />
        <div className="w-16 h-5 rounded-md bg-slate-100" />
        <div className="w-12 h-5 rounded-md bg-slate-100" />
      </div>
      <div className="w-full h-8 rounded-xl bg-slate-100" />
    </div>
  )
}

function SkeletonProjectCard() {
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
        <div className="w-12 h-5 rounded-md bg-slate-100" />
      </div>
      <div className="h-px bg-slate-100 mb-3" />
      <div className="flex justify-between">
        <div className="w-24 h-3 rounded bg-slate-100" />
        <div className="w-16 h-3 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function EmptyState({ type, hasFilters }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        {hasFilters ? (
          <SlidersHorizontal size={28} className="text-slate-400" />
        ) : type === 'students' ? (
          <Users size={28} className="text-slate-400" />
        ) : (
          <FolderSearch size={28} className="text-slate-400" />
        )}
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        {hasFilters ? 'No results match your filters' : `No ${type} found`}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs text-center">
        {hasFilters
          ? 'Try adjusting your search or removing some filters.'
          : type === 'students'
            ? 'Check back later as more students join TeamSync.'
            : 'Be the first to create a project!'}
      </p>
    </div>
  )
}

function StudentCard({ student, onConnect, connectedIds }) {
  const colorIdx = (student.name || '').length % AVATAR_COLORS.length
  const isConnected = connectedIds.has(student.id)
  const match = student.match_score ?? 0

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0`}
        >
          {getInitials(student.name)}
        </div>
        <MatchBadge percent={match} />
      </div>

      <h3 className="text-sm font-semibold text-slate-800 truncate">{student.name}</h3>
      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
        <MapPin size={11} className="shrink-0" />
        <span className="truncate">{student.department || 'No dept'} · Sem {student.semester || '?'}</span>
      </p>

      <div className="flex flex-wrap gap-1.5 mt-3 flex-1">
        {(student.skills || []).slice(0, 4).map(s => (
          <span
            key={s}
            className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
          >
            {s}
          </span>
        ))}
        {(student.skills || []).length > 4 && (
          <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
            +{student.skills.length - 4}
          </span>
        )}
      </div>

      <button
        disabled={isConnected}
        onClick={() => onConnect(student)}
        className={`w-full mt-4 py-2 text-xs font-semibold rounded-xl transition-all ${
          isConnected
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
            : 'text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-[0.98]'
        }`}
      >
        {isConnected ? (
          <span className="flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Request Sent
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <UserPlus size={13} /> Connect
          </span>
        )}
      </button>
    </div>
  )
}

function ProjectCard({ project }) {
  const navigate = useNavigate()
  const members = project.member_count ?? project.members ?? 0
  const maxMembers = project.max_members ?? 5

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-card-hover transition-all hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[project.status] || 'bg-slate-100 text-slate-500'}`}>
          {project.status}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Users size={12} />
          {members}/{maxMembers}
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-800 mb-1.5">{project.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
        {project.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(project.skills || []).slice(0, 3).map(s => (
          <span
            key={s}
            className="text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md"
          >
            {s}
          </span>
        ))}
        {(project.skills || []).length > 3 && (
          <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md">
            +{project.skills.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {project.owner_name || `by ${(project.owner_id || '').slice(0, 8) || 'Unknown'}`}
        </span>
        <button
          onClick={() => navigate(`/projects/${project.id}`)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 transition-colors"
        >
          View <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

function FilterSelect({ value, onChange, options, placeholder, icon: Icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || placeholder

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
          value
            ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        }`}
      >
        {Icon && <Icon size={14} />}
        <span className="max-w-[120px] truncate">{selectedLabel}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-30 py-1 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${!value ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
          >
            All
          </button>
          {options.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${String(opt.value) === String(value) ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null
  const nums = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      nums.push(i)
    } else if (nums[nums.length - 1] !== '...') {
      nums.push('...')
    }
  }
  return (
    <div className="flex items-center justify-center gap-1.5 pt-6">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ArrowLeft size={14} />
      </button>
      {nums.map((n, i) =>
        n === '...' ? (
          <span key={`dot-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
              n === page
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {n}
          </button>
        )
      )}
      <button
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ArrowRight size={14} />
      </button>
    </div>
  )
}

export default function Discover() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const type = searchParams.get('type') || 'students'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(1)

  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)
  const [connectedIds, setConnectedIds] = useState(new Set())

  // Starts empty — populated from /discover/meta
  const [meta, setMeta] = useState({ departments: [], semesters: [], skills: [] })

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, department, semester, selectedSkills, status, sort])

  const handleTabChange = (newType) => {
    setSearchParams({ type: newType })
    setSearch('')
    setDepartment('')
    setSemester('')
    setSelectedSkills([])
    setStatus('')
    setSort('relevance')
    setPage(1)
  }

  // Fetch filter options from DB
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`${API_BASE}/discover/meta`, { headers: getHeaders() })
        if (res.ok) {
          const data = await res.json()
          setMeta(prev => ({
            departments: data.departments?.length ? data.departments : prev.departments,
            semesters: data.semesters?.length ? data.semesters : prev.semesters,
            skills: data.skills?.length ? data.skills : prev.skills,
          }))
        }
      } catch {
        // filters will stay empty until server is reachable
      }
    }
    fetchMeta()
  }, [])

  // Fetch results from DB — NO mock fallback
  const fetchData = useCallback(async () => {
    setLoading(true)
    setApiError(null)

    try {
      const params = {
        search: debouncedSearch || undefined,
        page,
        limit: 12,
        sort: sort || undefined,
      }
      if (type === 'students') {
        params.department = department || undefined
        params.semester = semester || undefined
        if (selectedSkills.length) params.skills = selectedSkills
      } else {
        params.status = status || undefined
        if (selectedSkills.length) params.skills = selectedSkills
      }

      const qs = buildQuery(params)
      const res = await fetch(`${API_BASE}/discover/${type}?${qs}`, { headers: getHeaders() })

      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      } else {
        let errText = ''
        try { errText = await res.text() } catch (e) {}
        setApiError(`Server returned ${res.status}: ${errText.slice(0, 300)}`)
        setResults([])
        setTotal(0)
        setPages(1)
      }
    } catch (e) {
      setApiError(`Cannot reach server: ${e.message}`)
      setResults([])
      setTotal(0)
      setPages(1)
    }

    setLoading(false)
  }, [type, debouncedSearch, department, semester, selectedSkills, status, sort, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Connect handler
  const handleConnect = (student) => {
    setConnectedIds(prev => new Set([...prev, student.id]))
    toast.success(`Connection request sent to ${student.name}`, {
      icon: '🤝',
      style: { borderRadius: '12px', fontSize: '13px' },
      duration: 2500,
    })
  }

  // Toggle skill chip
  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const hasFilters = debouncedSearch || department || semester || selectedSkills.length || status
  const clearFilters = () => {
    setSearch('')
    setDepartment('')
    setSemester('')
    setSelectedSkills([])
    setStatus('')
    setSort('relevance')
  }

  const deptOptions = meta.departments.map(d => ({ value: d, label: d }))
  const semOptions = meta.semesters.map(s => ({ value: s, label: `Semester ${s}` }))
  const sortOptions = SORT_OPTIONS[type] || []

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-800"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Discover
            </h1>
            <p className="text-xs text-slate-500 -mt-0.5">
              Find your perfect {type === 'students' ? 'teammates' : 'projects'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        {[
          { key: 'students', label: 'Students', icon: Users },
          { key: 'projects', label: 'Projects', icon: FolderSearch },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              type === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search Bar ── */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={
            type === 'students'
              ? 'Search by name, skill, department...'
              : 'Search by title, skill, description...'
          }
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Filter Row ── */}
      {meta.departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Filter size={13} />
            <span className="font-medium">Filters</span>
          </div>

          {type === 'students' && (
            <>
              <FilterSelect
                value={department}
                onChange={setDepartment}
                options={deptOptions}
                placeholder="Department"
                icon={MapPin}
              />
              <FilterSelect
                value={semester}
                onChange={setSemester}
                options={semOptions}
                placeholder="Semester"
                icon={Clock}
              />
            </>
          )}

          {type === 'projects' && (
            <FilterSelect
              value={status}
              onChange={setStatus}
              options={PROJECT_STATUSES.map(s => ({ value: s, label: s }))}
              placeholder="Status"
              icon={Clock}
            />
          )}

          <FilterSelect
            value={sort}
            onChange={setSort}
            options={sortOptions}
            placeholder="Sort by"
            icon={Star}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-all"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Skills Chips ── */}
      {meta.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {meta.skills.map(skill => {
            const active = selectedSkills.includes(skill)
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {skill}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Active Skill Pills ── */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[11px] text-slate-400 font-medium">Skills:</span>
          {selectedSkills.map(skill => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md"
            >
              {skill}
              <button onClick={() => toggleSkill(skill)} className="hover:text-indigo-900">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Error Banner ── */}
      {apiError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700 mb-1">Failed to load from database</p>
          <p className="text-xs text-red-500 font-mono break-all leading-relaxed">{apiError}</p>
          <p className="text-xs text-red-400 mt-2">Make sure your FastAPI backend is running on port 8000 and the discover router is registered in main.py.</p>
        </div>
      )}

      {/* ── Results Count ── */}
      {!loading && !apiError && (
        <p className="text-xs text-slate-400 mb-4">
          Showing {results.length} of {total} {type} from database
        </p>
      )}

      {/* ── Results Grid ── */}
      {loading ? (
        <div className={`grid gap-4 ${type === 'students' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {Array.from({ length: 8 }).map((_, i) =>
            type === 'students' ? <SkeletonCard key={i} /> : <SkeletonProjectCard key={i} />
          )}
        </div>
      ) : apiError ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-3">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-sm font-medium text-slate-700">Could not reach the server</p>
          <p className="text-xs text-slate-400 mt-1">Check the error above and your FastAPI terminal</p>
        </div>
      ) : results.length === 0 ? (
        <EmptyState type={type} hasFilters={!!hasFilters} />
      ) : (
        <>
          <div className={`grid gap-4 ${type === 'students' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {type === 'students'
              ? results.map(s => <StudentCard key={s.id} student={s} onConnect={handleConnect} connectedIds={connectedIds} />)
              : results.map(p => <ProjectCard key={p.id} project={p} />)
            }
          </div>
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}