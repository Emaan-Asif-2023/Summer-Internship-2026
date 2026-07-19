import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import {
  User, Lock, Mail, Github, Linkedin, Save, Sparkles, Clock, Briefcase, Info, X, Check, MapPin, Upload, Zap
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

export default function Profile() {
  const { user, refreshUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('view') // 'view' | 'edit' | 'security'

  // Form states (Edit Profile)
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [department, setDepartment] = useState(user?.department || '')
  const [yearOfStudy, setYearOfStudy] = useState(user?.year_of_study || '1')
  const [selectedAvatarType, setSelectedAvatarType] = useState(
    user?.avatar_url?.startsWith('preset:') ? 'preset' : 'custom'
  )
  const [presetIndex, setPresetIndex] = useState(() => {
    if (user?.avatar_url?.startsWith('preset:')) {
      const idx = PRESET_AVATARS.indexOf(user.avatar_url.split('preset:')[1])
      return idx !== -1 ? idx : 0
    }
    return 0
  })
  const [customAvatarBase64, setCustomAvatarBase64] = useState(
    user?.avatar_url?.startsWith('data:image/') ? user.avatar_url : ''
  )
  const [skills, setSkills] = useState(user?.skills || [])
  const [customSkill, setCustomSkill] = useState('')
  const [interests, setInterests] = useState(user?.interests || [])
  const [customInterest, setCustomInterest] = useState('')

  // Custom preferred role support
  const [roles, setRoles] = useState(user?.roles || [])
  const [customRole, setCustomRole] = useState('')

  const [availability, setAvailability] = useState(user?.availability || AVAILABILITY_OPTIONS[1])
  const [openToTeam, setOpenToTeam] = useState(user?.open_to_team !== false)
  const [githubUrl, setGithubUrl] = useState(user?.github_url || '')
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url || '')

  const [activeSkillTab, setActiveSkillTab] = useState('Computer Science & IT')
  const [activeInterestTab, setActiveInterestTab] = useState('Computer Science & IT')

  const [savingProfile, setSavingProfile] = useState(false)

  // Form states (Security)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState(0) // 0: inactive, 1: otp & new pass
  const [forgotOtpCode, setForgotOtpCode] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false)
  const [resettingForgotPassword, setResettingForgotPassword] = useState(false)

  // Sync form states with user context data when activeTab changes to 'edit'
  useEffect(() => {
    if (activeTab === 'edit' && user) {
      setName(user.name || '')
      setBio(user.bio || '')
      setDepartment(user.department || '')
      setYearOfStudy(user.year_of_study || '1')

      if (user.avatar_url?.startsWith('preset:')) {
        setSelectedAvatarType('preset')
        const idx = PRESET_AVATARS.indexOf(user.avatar_url.split('preset:')[1])
        setPresetIndex(idx !== -1 ? idx : 0)
      } else if (user.avatar_url) {
        setSelectedAvatarType('custom')
        setCustomAvatarBase64(user.avatar_url)
      } else {
        setSelectedAvatarType('preset')
        setPresetIndex(0)
      }

      setSkills(user.skills || [])
      setInterests(user.interests || [])
      setRoles(user.roles || [])
      setAvailability(user.availability || AVAILABILITY_OPTIONS[1])
      setOpenToTeam(user.open_to_team !== false)
      setGithubUrl(user.github_url || '')
      setLinkedinUrl(user.linkedin_url || '')
    }
  }, [activeTab, user])

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

  // Toggles & Adders
  const toggleSkill = (skill) => {
    if (skills.includes(skill)) setSkills(skills.filter(s => s !== skill))
    else setSkills([...skills, skill])
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
      setCustomSkill('')
    }
  }

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) setInterests(interests.filter(i => i !== interest))
    else setInterests([...interests, interest])
  }

  const addCustomInterest = () => {
    const trimmed = customInterest.trim()
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed])
      setCustomInterest('')
    }
  }

  const toggleRole = (role) => {
    if (roles.includes(role)) setRoles(roles.filter(r => r !== role))
    else setRoles([...roles, role])
  }

  const addCustomRole = () => {
    const trimmed = customRole.trim()
    if (trimmed && !roles.includes(trimmed)) {
      setRoles([...roles, trimmed])
      setCustomRole('')
    }
  }

  const handleDeleteAccount = () => {
    setShowDeleteModal(true)
  }

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false)
    try {
      await api.delete('/api/users/me')
      toast.success('Account permanently deleted.')
      logout()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete account')
    }
  }

  const handleSendForgotOtp = async () => {
    if (!user?.email) return
    setSendingForgotOtp(true)
    try {
      await api.post('/api/auth/forgot-password/send-otp', { email: user.email })
      toast.success('Reset OTP sent to your email!')
      setForgotStep(1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset code')
    } finally {
      setSendingForgotOtp(false)
    }
  }

  const handleResetPasswordForgot = async (e) => {
    e.preventDefault()
    if (!forgotOtpCode.trim()) return toast.error('OTP code is required')
    if (forgotNewPassword.length < 8) return toast.error('Password must be at least 8 characters')
    if (forgotNewPassword !== forgotConfirmPassword) return toast.error('Passwords do not match')

    setResettingForgotPassword(true)
    try {
      await api.post('/api/auth/forgot-password/reset', {
        email: user.email,
        code: forgotOtpCode,
        new_password: forgotNewPassword
      })
      toast.success('Password reset successfully!')
      setForgotStep(0)
      setForgotOtpCode('')
      setForgotNewPassword('')
      setForgotConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    } finally {
      setResettingForgotPassword(false)
    }
  }

  // Save profile info
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Name cannot be empty')
    if (!department.trim()) return toast.error('Department is required')
    if (skills.length === 0) return toast.error('Please select at least one skill')
    if (roles.length === 0) return toast.error('Please select at least one preferred role')

    setSavingProfile(true)
    let avatarUrl = ''
    if (selectedAvatarType === 'preset') {
      avatarUrl = `preset:${PRESET_AVATARS[presetIndex]}`
    } else {
      avatarUrl = customAvatarBase64
    }

    const payload = {
      name,
      bio,
      department,
      year_of_study: isNaN(parseInt(yearOfStudy)) ? null : parseInt(yearOfStudy),
      skills,
      interests,
      roles,
      availability,
      open_to_team: openToTeam,
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      avatar_url: avatarUrl
    }

    try {
      await api.put('/api/users/profile', payload)
      toast.success('Profile updated successfully!')
      await refreshUser()
      setActiveTab('view')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match')

    setChangingPassword(true)
    try {
      await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  // Helper: render profile photo inside containers
  const renderAvatarContent = (sizeClass = 'w-24 h-24 text-2xl') => {
    const avatar = user?.avatar_url
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
          alt={user.name}
          className={`${sizeClass} rounded-full object-cover border-4 border-white shadow-md`}
        />
      )
    }
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold border-4 border-white shadow-md`}>
        {initials}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile Header Block */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        {renderAvatarContent()}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {user?.name}
            </h1>
            {user?.open_to_team ? (
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
            {user?.email}
          </p>
          <p className="text-xs text-slate-400">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 rounded-2xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'view' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Security
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'view' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel details */}
          <div className="md:col-span-1 space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <User size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Bio
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{user?.bio || 'No bio written yet.'}"
              </p>
            </div>

            {/* General info details */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <MapPin size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Study & Status
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Department</p>
                  <p className="text-xs font-semibold text-slate-700">{user?.department || 'Not configured'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Year of study</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {user?.year_of_study ? (user.year_of_study === 'Others' ? 'Others' : `Year ${user.year_of_study}`) : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Time Availability</p>
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-slate-400" />
                    {user?.availability || 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right main details panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Skills, Interests, and Portals Panel */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                  <Zap size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Expertise & Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {user?.skills?.length > 0 ? (
                    user.skills.map(s => (
                      <span key={s} className="text-xs font-semibold px-3 py-1 bg-primary/5 text-primary rounded-lg">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No skills added yet.</span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                  <Briefcase size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Preferred Roles
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {user?.roles?.length > 0 ? (
                    user.roles.map(r => (
                      <span key={r} className="text-xs font-semibold px-3 py-1 bg-secondary/5 text-secondary rounded-lg">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No preferred roles configured.</span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                  <Info size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Fields of Interest
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {user?.interests?.length > 0 ? (
                    user.interests.map(i => (
                      <span key={i} className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
                        {i}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No interests added yet.</span>
                  )}
                </div>
              </div>

              {/* Portfolios & Portals Section (Merged into main card) */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                  <Github size={16} className="text-purple-500 fill-purple-500/10 shrink-0" /> Portfolios & Portals
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  {user?.github_url ? (
                    <a
                      href={user.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-between p-3.5 border border-slate-200 rounded-xl hover:border-slate-800 transition-colors text-xs font-semibold text-slate-700 hover:text-slate-900"
                    >
                      <span className="flex items-center gap-2">
                        <Github size={16} className="text-slate-800" /> GitHub Profile
                      </span>
                      <span>→</span>
                    </a>
                  ) : (
                    <div className="flex-1 p-3.5 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      GitHub not linked
                    </div>
                  )}

                  {user?.linkedin_url ? (
                    <a
                      href={user.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-between p-3.5 border border-slate-200 rounded-xl hover:border-blue-600 transition-colors text-xs font-semibold text-slate-700 hover:text-blue-600"
                    >
                      <span className="flex items-center gap-2">
                        <Linkedin size={16} className="text-blue-600" /> LinkedIn Profile
                      </span>
                      <span>→</span>
                    </a>
                  ) : (
                    <div className="flex-1 p-3.5 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      LinkedIn not linked
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'edit' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Section 1: Avatar upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Choose Profile Picture</label>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {selectedAvatarType === 'preset' ? (
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${PRESET_AVATARS[presetIndex]} flex items-center justify-center text-white font-bold border-2 border-slate-100 shadow-md`}>
                  {initials}
                </div>
              ) : (
                <img
                  src={customAvatarBase64}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-md"
                />
              )}

              <div className="flex-1 space-y-3 w-full">
                <div className="flex gap-2">
                  {PRESET_AVATARS.map((gradient, index) => (
                    <button
                      key={gradient}
                      type="button"
                      onClick={() => {
                        setPresetIndex(index)
                        setSelectedAvatarType('preset')
                      }}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} border transition-transform ${selectedAvatarType === 'preset' && presetIndex === index
                          ? 'scale-110 border-slate-800 ring-2 ring-primary/20'
                          : 'border-white hover:scale-105'
                        }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors w-full sm:w-auto">
                    <Upload size={12} /> Upload new image
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Name & Bio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Weekly Availability</label>
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
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {/* Section 3: Grouped Skills & Live chips */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skills <span className="text-red-500">*</span></label>
            {skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-primary text-white rounded-lg">
                    {s}
                    <button type="button" onClick={() => toggleSkill(s)} className="hover:bg-white/20 rounded p-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-hide border-b border-slate-100">
              {Object.keys(SKILLS_BY_CATEGORY).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveSkillTab(cat)}
                  className={`text-[11px] px-2.5 py-1.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${activeSkillTab === cat
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {cat.split(' (')[0]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-slate-100 rounded-xl mb-3 bg-slate-50/50">
              {SKILLS_BY_CATEGORY[activeSkillTab].map(s => {
                const isSelected = skills.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Or add a custom skill..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Section 4: Grouped Interests & Live chips */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Interests</label>
            {interests.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                {interests.map(i => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-secondary text-white rounded-lg">
                    {i}
                    <button type="button" onClick={() => toggleInterest(i)} className="hover:bg-white/20 rounded p-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-hide border-b border-slate-100">
              {Object.keys(INTERESTS_BY_CATEGORY).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveInterestTab(cat)}
                  className={`text-[11px] px-2.5 py-1.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${activeInterestTab === cat
                      ? 'border-secondary text-secondary bg-secondary/5'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-slate-100 rounded-xl mb-3 bg-slate-50/50">
              {INTERESTS_BY_CATEGORY[activeInterestTab].map(i => {
                const isSelected = interests.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition-all ${isSelected ? 'bg-secondary border-secondary text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {i}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                placeholder="Or add a custom interest..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={addCustomInterest}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Preferred Roles selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Roles <span className="text-red-500">*</span></label>

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
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${isSelected ? 'bg-primary/5 border-primary text-primary font-bold' : 'bg-white border-slate-200 text-slate-500'
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

          {/* Social URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Github size={14} /> GitHub URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Linkedin size={14} /> LinkedIn URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Toggle invite status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-700">Open to team invitations</p>
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

          {/* Action button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
            >
              <Save size={16} /> {savingProfile ? 'Saving Details...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {forgotStep === 0 ? (
            <form onSubmit={handleChangePassword} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2 flex items-center gap-1.5">
                <Lock size={18} className="text-primary" /> Change Password
              </h2>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Current Password</label>
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={sendingForgotOtp}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {sendingForgotOtp ? 'Sending OTP...' : 'Forgot Password?'}
                  </button>
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                >
                  <Save size={16} /> {changingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordForgot} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock size={18} className="text-primary" /> Reset Forgotten Password
                </h2>
                <button
                  type="button"
                  onClick={() => setForgotStep(0)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
                A verification code has been sent to <strong>{user?.email}</strong>. Enter the code and choose a new password.
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">OTP Verification Code</label>
                <input
                  type="text"
                  value={forgotOtpCode}
                  onChange={(e) => setForgotOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep(0)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingForgotPassword}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                >
                  {resettingForgotPassword ? 'Resetting Password...' : 'Verify & Reset Password'}
                </button>
              </div>
            </form>
          )}

          {/* Danger Zone */}
          <div className="bg-red-50/50 rounded-3xl border border-red-100 p-6 sm:p-8 space-y-4">
            <h2 className="text-base font-bold text-red-800 border-b border-red-100 pb-2 flex items-center gap-1.5">
              ⚠️ Danger Zone
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-red-800">Delete Account</p>
                <p className="text-xs text-red-600/80">Permanently delete your TeamSync profile and clean up all project matches. This action cannot be undone.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-200"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-red-600 flex items-center gap-2">
              ⚠️ Confirm Account Deletion
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete your TeamSync profile? This action will clean up all your matches, and cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-200"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
