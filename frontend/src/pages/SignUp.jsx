import { useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock, Mail, User, Eye, EyeOff, Users, ArrowLeft, RefreshCw, ArrowRight } from 'lucide-react'
import api from '../api/axios.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function SignUp() {
  const [step, setStep] = useState(1)  // 1 = form, 2 = OTP
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef([])
  const cooldownTimer = useRef(null)
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

  // ── Password strength ──
  const getPasswordStrength = (pwd) => {
    if (pwd.length === 0) return null
    if (pwd.length < 6) return { label: 'Too short', color: 'bg-red-400', width: '25%' }
    if (pwd.length < 8) return { label: 'Weak', color: 'bg-orange-400', width: '45%' }
    const hasUpper = /[A-Z]/.test(pwd)
    const hasNum = /\d/.test(pwd)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
    const score = [hasUpper, hasNum, hasSpecial].filter(Boolean).length
    if (score === 3) return { label: 'Strong', color: 'bg-green-500', width: '100%' }
    if (score >= 1) return { label: 'Good', color: 'bg-blue-500', width: '70%' }
    return { label: 'Fair', color: 'bg-yellow-400', width: '55%' }
  }
  const strength = getPasswordStrength(form.password)

  // ── OTP helpers ──
  const startResendCooldown = () => {
    setResendCooldown(60)
    clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownTimer.current); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // ── Step 1: Send OTP ──
  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Please enter your full name'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    const toastId = toast.loading('Sending verification code...')
    try {
      await api.post('/api/auth/send-otp', { email: form.email })
      toast.success(`Code sent to ${form.email}`, { id: toastId })
      setStep(2)
      startResendCooldown()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send code', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await api.post('/api/auth/send-otp', { email: form.email })
      toast.success('New code sent!')
      startResendCooldown()
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resend')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify & Register ──
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return }
    setLoading(true)
    const toastId = toast.loading('Verifying code...')
    try {
      await api.post('/api/auth/verify-otp', { email: form.email, code })
      toast.success('Email verified!', { id: toastId })
      const regToast = toast.loading('Creating your account...')
      const res = await api.post('/api/auth/register', form)
      toast.success('Account created!', { id: regToast })
      login(res.data.access_token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const otpComplete = otp.join('').length === 6

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #6366f1 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-white/5 rounded-full" />

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

          {/* ── STEP 1: Registration form ── */}
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold text-slate-800 mb-1"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Create Account
              </h1>
              <p className="text-slate-500 text-sm mb-8">Join thousands of students finding great teammates.</p>

              <form onSubmit={handleSendOtp} className="space-y-5">
                {/* Full name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      placeholder="e.g. Ali Hassan"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full pl-9 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      placeholder="Min. 8 characters"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {strength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${
                        strength.label === 'Strong' ? 'text-green-600' :
                        strength.label === 'Good' ? 'text-blue-600' :
                        strength.label === 'Fair' ? 'text-yellow-600' :
                        'text-red-500'
                      }`}>{strength.label}</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2 group mt-2"
                >
                  {loading ? 'Sending code...' : (
                    <>
                      Continue
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account?{' '}
                <Link to="/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP verification ── */}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary mb-6 transition-colors"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
                <Mail size={22} className="text-primary" />
              </div>

              <h1 className="text-3xl font-bold text-slate-800 mb-1"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Check your email
              </h1>
              <p className="text-slate-500 text-sm mb-1">We sent a 6-digit code to</p>
              <p className="font-semibold text-slate-800 text-sm mb-7">{form.email}</p>

              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                {/* OTP boxes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                    Enter verification code
                  </label>
                  <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors ${
                          digit
                            ? 'border-primary bg-blue-50 text-primary'
                            : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !otpComplete}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2 group"
                >
                  {loading ? 'Creating account...' : (
                    <>
                      Verify &amp; Create Account
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-sm text-slate-500">Didn't receive the code?</p>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline disabled:opacity-50 mx-auto mt-1.5 transition-colors"
                >
                  <RefreshCw size={13} className={resendCooldown > 0 ? '' : 'group-hover:rotate-180 transition-transform'} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
