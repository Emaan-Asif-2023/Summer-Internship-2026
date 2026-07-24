import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import {
  Upload, ChevronRight, ChevronLeft, Sparkles,
  Github, Linkedin, Info, User, Check, Briefcase, Clock, X
} from 'lucide-react'

const PRESET_AVATARS = [
  'from-indigo-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-violet-400 to-fuchsia-500',
]

const SKILLS_BY_CATEGORY = {
  'Computer Science & IT': [
    'React', 'Node.js', 'Python', 'FastAPI', 'MongoDB', 'Figma', 'UI/UX',
    'Tailwind CSS', 'TypeScript', 'JavaScript', 'SQL', 'PostgreSQL',
    'Java', 'Spring Boot', 'C++', 'Flutter', 'React Native', 'Docker',
    'Machine Learning', 'TensorFlow', 'Git', 'AWS', 'Firebase'
  ],
  'Business & Finance (ACCA/CA)': [
    'Financial Accounting', 'Management Accounting', 'Financial Analysis',
    'Auditing', 'Taxation', 'Corporate Finance', 'Excel / Financial Modeling',
    'Strategic Management', 'Portfolio Management', 'QuickBooks', 'Xero',
    'Risk Management', 'Business Law', 'Cost Accounting'
  ],
  'Medical & Health (MBBS/BDS)': [
    'Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 'Pathology',
    'Microbiology', 'Clinical Diagnostics', 'Patient Care', 'Medical Research',
    'First Aid / BLS', 'Health Informatics', 'Surgical Procedures', 'Biostatistics'
  ],
  'Arts, Design & Media': [
    'Graphic Design', 'Figma / Adobe Suite', 'Video Editing', 'Content Writing',
    'Copywriting', 'Photography', 'Motion Graphics', 'Illustration', 'Brand Strategy',
    'Social Media Marketing', '3D Modeling', 'Animation'
  ],
  'General & Engineering': [
    'Project Management', 'Public Speaking', 'Team Leadership', 'Technical Writing',
    'CAD Modeling', 'MATLAB', 'Circuit Design', 'Arduino / Embedded Systems',
    'Problem Solving', 'Data Entry', 'Critical Thinking'
  ]
}

const INTERESTS_BY_CATEGORY = {
  'Computer Science & IT': [
    'Web Development', 'Mobile Apps', 'Artificial Intelligence',
    'Machine Learning', 'Cybersecurity', 'Cloud Computing',
    'Game Development', 'Data Science', 'Blockchain', 'DevOps', 'Open Source'
  ],
  'Business & Finance': [
    'FinTech Startups', 'Stock Market & Investing', 'Business Analytics',
    'Entrepreneurship', 'Corporate Governance', 'Financial Inclusion', 'Tax Compliance'
  ],
  'Medical & Health': [
    'Digital Health', 'Bioinformatics', 'Global Health', 'Epidemiology',
    'Medical Technology', 'Public Health Campaigns', 'Telemedicine'
  ],
  'Arts & Creative': [
    'User Experience (UX)', 'UI Design', 'Digital Art & NFTs', 'Cinematography',
    'Podcasting', 'Creative Writing', 'Product Design'
  ],
  'General & Engineering': [
    'Robotics & Automation', 'Renewable Energy', 'IoT Projects', 'Academic Research',
    'Social Work', 'Community Building', 'Product Management'
  ]
}

const ROLE_OPTIONS = [
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Fullstack Developer', label: 'Fullstack Developer' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Mobile App Developer', label: 'Mobile Developer' },
  { value: 'Project Manager', label: 'Project Manager' },
  { value: 'Data Scientist', label: 'Data Scientist / AI Engineer' },
  { value: 'Financial Analyst', label: 'Financial Analyst / Auditor' },
  { value: 'Medical Advisor', label: 'Medical Research Specialist' },
  { value: 'Content Creator', label: 'Content Creator / Copywriter' }
]

const AVAILABILITY_OPTIONS = [
  'Less than 5 hours / week',
  '5-10 hours / week',
  '10-15 hours / week',
  '15-20 hours / week',
  '20+ hours / week'
]


export default function CompleteProfile() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Form states
  const [bio, setBio] = useState('')
  const [department, setDepartment] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState(1)
  const [selectedAvatarType, setSelectedAvatarType] = useState('preset') // 'preset' | 'custom'
  const [presetIndex, setPresetIndex] = useState(0)
  const [customAvatarBase64, setCustomAvatarBase64] = useState('')

  const [skills, setSkills] = useState([])
  const [customSkill, setCustomSkill] = useState('')
  const [interests, setInterests] = useState([])
  const [customInterest, setCustomInterest] = useState('')
  const [activeSkillTab, setActiveSkillTab] = useState('Computer Science & IT')
  const [activeInterestTab, setActiveInterestTab] = useState('Computer Science & IT')

  const [roles, setRoles] = useState([])
  const [customRole, setCustomRole] = useState('')
  const [availability, setAvailability] = useState(AVAILABILITY_OPTIONS[1])
  const [openToTeam, setOpenToTeam] = useState(true)

  const [gitHubUrl, setGitHubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  // Computed initials
  const initials = useMemo(() => {
    if (!user?.name) return 'US'
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }, [user])

  // Custom avatar upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 500 * 1024) {
      toast.error('Image size must be less than 500KB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCustomAvatarBase64(reader.result)
      setSelectedAvatarType('custom')
    }
    reader.readAsDataURL(file)
  }

  // Toggle helpers
  const toggleSkill = (skill) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill))
    } else {
      setSkills([...skills, skill])
    }
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
      setCustomSkill('')
    }
  }

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest))
    } else {
      setInterests([...interests, interest])
    }
  }

  const addCustomInterest = () => {
    const trimmed = customInterest.trim()
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed])
      setCustomInterest('')
    }
  }

  const toggleRole = (role) => {
    if (roles.includes(role)) {
      setRoles(roles.filter(r => r !== role))
    } else {
      setRoles([...roles, role])
    }
  }

  const addCustomRole = () => {
    const trimmed = customRole.trim()
    if (trimmed && !roles.includes(trimmed)) {
      setRoles([...roles, trimmed])
      setCustomRole('')
    }
  }

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Determine final avatar string
    let avatarUrl = ''
    if (selectedAvatarType === 'preset') {
      avatarUrl = `preset:${PRESET_AVATARS[presetIndex]}`
    } else {
      avatarUrl = customAvatarBase64
    }

    const payload = {
      name: user?.name || 'User',
      bio,
      department,
      year_of_study: parseInt(yearOfStudy),
      skills,
      interests,
      roles,
      availability,
      open_to_team: openToTeam,
      gitHub_url: gitHubUrl,
      linkedin_url: linkedinUrl,
      avatar_url: avatarUrl
    }

    try {
      await api.put('/api/users/profile', payload)
      toast.success('Profile completed successfully!')
      await refreshUser()
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  // Navigation validation
  const canGoNext = () => {
    if (step === 1) {
      return department.trim() !== '' && bio.trim() !== ''
    }
    if (step === 2) {
      return skills.length > 0
    }
    if (step === 3) {
      return roles.length > 0
    }
    return true
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">

        {/* Header indicator */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
              Step {step} of 4
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {step === 1 && 'Let’s start with the basics'}
            {step === 2 && 'What are your skills?'}
            {step === 3 && 'How do you work?'}
            {step === 4 && 'Add your socials'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === 1 && 'Set up your department, year, bio, and profile avatar.'}
            {step === 2 && 'Select at least one skill and show your research interests.'}
            {step === 3 && 'Choose your preferred roles and weekly time commitment.'}
            {step === 4 && 'Optionally link your developer accounts to showcase your portfolio.'}
          </p>

          {/* Step Progress Line */}
          <div className="flex gap-2 mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-full rounded-full transition-all duration-300 flex-1 ${s <= step ? 'bg-primary' : 'bg-slate-100'
                  }`}
              />
            ))}
          </div>
        </div>


        {/* Content Body */}
        <div className="p-8 flex-1">
          {step === 1 && (
            <div className="space-y-6">
              {/* Avatar Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Choose Profile Picture</label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Left Side: Avatar Display */}
                  {selectedAvatarType === 'preset' ? (
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${PRESET_AVATARS[presetIndex]} flex items-center justify-center text-white text-xl font-bold border-4 border-slate-100 shadow-md`}>
                      {initials}
                    </div>
                  ) : (
                    <img
                      src={customAvatarBase64}
                      alt="Uploaded Avatar"
                      className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 shadow-md"
                    />
                  )}

                  {/* Right Side: Options Selector */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex gap-2">
                      {PRESET_AVATARS.map((gradient, index) => (
                        <button
                          key={gradient}
                          onClick={() => {
                            setPresetIndex(index)
                            setSelectedAvatarType('preset')
                          }}
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} border-2 transition-transform ${selectedAvatarType === 'preset' && presetIndex === index
                              ? 'scale-110 border-slate-800 ring-2 ring-primary/20'
                              : 'border-white scale-100 hover:scale-105'
                            }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors w-full sm:w-auto">
                        <Upload size={14} />
                        Upload custom image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      {selectedAvatarType === 'custom' && (
                        <span className="text-xs text-primary font-medium">✓ Uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Short Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Passionate software engineering student interested in fullstack web development and AI projects."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  required
                />
              </div>

              {/* Department & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year of Study</label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {['1', '2', '3', '4', '5', 'Others'].map(yr => (
                      <option key={yr} value={yr}>{yr === 'Others' ? 'Others' : `Year ${yr}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Skills */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Select Skills <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400">Add at least one skill</span>
                </div>

                {/* Selected Skills Chips (Live User Feedback) */}
                {skills.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Your Selected Skills ({skills.length}):</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      {skills.map(s => (
                        <span key={s} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-primary text-white rounded-lg shadow-sm">
                          {s}
                          <button
                            type="button"
                            onClick={() => toggleSkill(s)}
                            className="hover:bg-white/20 rounded p-0.5 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Category Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-hide border-b border-slate-100">
                  {Object.keys(SKILLS_BY_CATEGORY).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveSkillTab(cat)}
                      className={`text-xs px-3 py-1.5 font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${activeSkillTab === cat
                          ? 'border-primary text-primary bg-primary/5 font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {cat.split(' (')[0]}
                    </button>
                  ))}
                </div>

                {/* Recommended Skills Checklist */}
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-100 rounded-xl mb-3 bg-slate-50/50">
                  {SKILLS_BY_CATEGORY[activeSkillTab].map(s => {
                    const isSelected = skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${isSelected
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                    placeholder="Or type a custom skill..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interests</label>

                {/* Selected Interests Chips (Live User Feedback) */}
                {interests.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Your Selected Interests ({interests.length}):</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      {interests.map(i => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-secondary text-white rounded-lg shadow-sm">
                          {i}
                          <button
                            type="button"
                            onClick={() => toggleInterest(i)}
                            className="hover:bg-white/20 rounded p-0.5 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests Category Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-hide border-b border-slate-100">
                  {Object.keys(INTERESTS_BY_CATEGORY).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveInterestTab(cat)}
                      className={`text-xs px-3 py-1.5 font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${activeInterestTab === cat
                          ? 'border-secondary text-secondary bg-secondary/5 font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Recommended Interests Checklist */}
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-100 rounded-xl mb-3 bg-slate-50/50">
                  {INTERESTS_BY_CATEGORY[activeInterestTab].map(i => {
                    const isSelected = interests.includes(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleInterest(i)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${isSelected
                            ? 'bg-secondary border-secondary text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Interest Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
                    placeholder="Or type a custom interest..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addCustomInterest}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {/* Roles */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Preferred Roles <span className="text-red-500">*</span>
                </label>

                {/* Selected Roles Chips (Live Feedback) */}
                {roles.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Selected Roles ({roles.length}):</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      {roles.map(r => (
                        <span key={r} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-primary text-white rounded-lg shadow-sm">
                          {r}
                          <button
                            type="button"
                            onClick={() => toggleRole(r)}
                            className="hover:bg-white/20 rounded p-0.5 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map(role => {
                    const isSelected = roles.includes(role.value)
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggleRole(role.value)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${isSelected
                            ? 'bg-primary/5 border-primary text-primary font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {role.label}
                        {isSelected && <Check size={14} className="text-primary" />}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Role Input */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
                    placeholder="Can't find your role? Type it here..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addCustomRole}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" />
                  Weekly Time Commitment
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Toggle: Open to Teams */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Briefcase size={16} className="text-slate-400" />
                    Open to team invitations
                  </p>
                  <p className="text-xs text-slate-400">Allow project managers to find and invite you.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openToTeam}
                    onChange={(e) => setOpenToTeam(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              {/* GitHub */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Github size={16} className="text-slate-700" />
                  GitHub URL (Optional)
                </label>
                <input
                  type="url"
                  value={gitHubUrl}
                  onChange={(e) => setGitHubUrl(e.target.value)}
                  placeholder="https://github.com/your-username"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Linkedin size={16} className="text-blue-600" />
                  LinkedIn URL (Optional)
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Verification Info Alert */}
              <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Almost there!</span> Submitting this wizard will activate your profile and unlock full system access. You can edit these details later inside the Profile settings page.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation buttons */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canGoNext()}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
              >
                {loading ? 'Activating Profile...' : 'Complete & Launch'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
