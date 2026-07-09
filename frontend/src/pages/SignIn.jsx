import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock, Mail, Eye, EyeOff, Users, X, ArrowRight } from 'lucide-react'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'

// ── Forgot Password Modal ──
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState('email') // 'email' | 'otp' | 'reset' | 'confirm'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password/send-otp', { email: email.trim() })
      toast.success('Reset code sent — check your inbox')
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password/verify-otp', { email: email.trim(), code: code.trim() })
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    setStep('confirm')
  }

  const doReset = async () => {
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password/reset', {
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      })
      toast.success('Password reset successfully — sign in with your new password')
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed')
      setStep('reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>

        {step === 'email' && (
          <>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Mail size={20} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Forgot password?</h2>
            <p className="text-sm text-slate-500 mb-5">Enter your email and we'll send a reset code.</p>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Enter reset code</h2>
            <p className="text-sm text-slate-500 mb-5">
              We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>.
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" onClick={() => setStep('email')}
                className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Back
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Set new password</h2>
            <p className="text-sm text-slate-500 mb-5">Choose a new password for your account.</p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
                Reset Password
              </button>
            </form>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Confirm reset</h2>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to reset your password?</p>
            <div className="space-y-3">
              <button onClick={doReset} disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
                {loading ? 'Resetting...' : 'Yes, Reset Password'}
              </button>
              <button type="button" onClick={() => setStep('reset')}
                className="w-full text-sm text-slate-500 hover:text-slate-700 py-2">
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
// ── End Forgot Password Modal ──


export default function SignIn() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '', general: '' })
  const [showForgot, setShowForgot] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const TAGLINES = [
    'Find the right teammates for your project, instantly.',
    'Stop relying on friend circles. Build your dream team.',
    'Your skills. Your vision. Your team.',
    'The smarter way to find your perfect team.',
    'Collaborate with people who complement you.',
    'Build teams based on skills, not friendships.',
    'Where great teams are made.',
    'Find teammates who match your ambition.',
  ]
  const tagline = useMemo(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)], [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({ email: '', password: '', general: '' })
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', form)
      login(res.data.access_token, res.data.user)
      toast.success(`Welcome back, ${res.data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setErrors(e => ({ ...e, general: 'Request timed out. Check your connection and try again.' }))
      } else {
        const detail = err.response?.data?.detail || 'Login failed'
        if (detail.toLowerCase().includes('email') || detail.toLowerCase().includes('account')) {
          setErrors(e => ({ ...e, email: detail }))
        } else if (detail.toLowerCase().includes('password')) {
          setErrors(e => ({ ...e, password: detail }))
        } else {
          setErrors(e => ({ ...e, general: detail }))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #6366f1 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-white/5 rounded-full" />

        {/* Main content */}
        <div className="relative text-center text-white z-10">
          {/* Logo + Name */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-white/15 backdrop-blur border border-white/25 rounded-2xl flex items-center justify-center">
              <Users size={28} className="text-white" />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-4xl font-extrabold tracking-tight">
              TeamSync
            </span>
          </div>

          {/* Tagline */}
          <p className="text-white/70 text-lg mb-10">
            {tagline}
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 items-center">
            {[
              '🎯  Skill-based matching',
              '💬  Real-time team chat',
              '🔍  Smart profile discovery',
            ].map((f) => (
              <div key={f}
                className="bg-white/10 backdrop-blur border border-white/20 rounded-full px-6 py-2.5 text-sm text-white/90 w-64">
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-2xl font-extrabold text-slate-800">
              TeamSync
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sign In
          </h1>
          <p className="text-slate-500 text-sm mb-8">Welcome back — let's find your next team.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(er => ({ ...er, email: '' })) }}
                  placeholder="you@example.com"
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  required
                />
              </div>
              {errors.email && <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors(er => ({ ...er, password: '' })) }}
                  placeholder="Your password"
                  className={`w-full pl-9 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.password}</p>}
              <div className="text-right mt-1.5">
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
            </div>

            {/* General error */}
            {errors.general && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.general}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2 group"
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign In
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to TeamSync?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
