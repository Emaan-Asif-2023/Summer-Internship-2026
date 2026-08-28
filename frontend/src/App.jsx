import { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { Handshake } from 'lucide-react'

import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './components/homelayout/dashboardLayout.jsx'
import Home from './pages/Home.jsx'
import CompleteProfile from './pages/CompleteProfile.jsx'
import Profile from './pages/Profile.jsx'
import Discover from './pages/Discover.jsx'
import Notifications from './pages/Notifications.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import Chats from './pages/Chats.jsx'
import Projects from './pages/Projects.jsx'

// ── Splash Screen ──────────────────────────────────────────

function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter')
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (prefersReduced) {
      onFinish()
      return
    }
    const t1 = setTimeout(() => setPhase('hold'), 400)
    const t2 = setTimeout(() => setPhase('exit'), 2000)
    const t3 = setTimeout(() => onFinish(), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish, prefersReduced])

  if (prefersReduced) return null

  const opacity = phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1
  const scale = phase === 'enter' ? 0.92 : phase === 'exit' ? 0.96 : 1
  const logoScale = phase === 'enter' ? 0.5 : 1
  const textY = phase === 'enter' ? 12 : 0
  const dotsOpacity = phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'linear-gradient(145deg, #0f0a2e 0%, #1e1b4b 35%, #312e81 65%, #4338ca 100%)',
        opacity,
        transform: `scale(${scale})`,
        transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Ambient glows */}
      <div
        className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
          top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full opacity-10 blur-2xl"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          bottom: '15%', right: '20%',
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="relative inline-block mb-6">
          <div
            className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
              backdropFilter: 'blur(12px)',
              transform: `scale(${logoScale})`,
              transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Handshake size={36} className="text-white/90" strokeWidth={1.8} />
          </div>
          {phase === 'hold' && (
            <div
              className="absolute -inset-3 rounded-3xl border border-white/10"
              style={{ animation: 'splash-ping 2s cubic-bezier(0,0,0.2,1) infinite' }}
            />
          )}
        </div>

        {/* Title */}
        <h1
          className="text-4xl font-extrabold text-white tracking-tight mb-2"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transform: `translateY(${textY}px)`,
            opacity: phase === 'enter' ? 0 : 1,
            transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s, opacity 0.5s ease 0.15s',
          }}
        >
          Team<span className="text-indigo-300">Sync</span>
        </h1>

        <p
          className="text-white/40 text-sm tracking-wide mb-8"
          style={{
            transform: `translateY(${textY}px)`,
            opacity: phase === 'enter' ? 0 : 1,
            transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.25s, opacity 0.5s ease 0.25s',
          }}
        >
          Find your perfect team
        </p>

        {/* Dots */}
        <div
          className="flex justify-center gap-2"
          style={{ opacity: dotsOpacity, transition: 'opacity 0.4s ease' }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/50"
              style={{
                animation: 'splash-bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splash-ping {
          0%   { transform: scale(1); opacity: 0.5; }
          75%, 100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes splash-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

// ── Coming Soon ────────────────────────────────────────────

function ComingSoon({ title }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🚧</span>
      </div>
      <h1
        className="text-2xl font-bold text-slate-800 mb-2"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {title}
      </h1>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">
        This page is under construction. Check back soon!
      </p>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem('ts_splash_shown')
  })

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem('ts_splash_shown', '1')
    setShowSplash(false)
  }, [])

  // Block entire app — no router, no redirects, nothing mounts until splash ends
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Home />} />
            </Route>

            <Route path="/discover" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Discover />} />
            </Route>

            <Route path="/projects" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Projects />} />
            </Route>

            <Route path="/chats" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Chats />} />
            </Route>

            <Route path="/notifications" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Notifications />} />
            </Route>

            <Route path="/profile" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Profile />} />
            </Route>

            <Route path="/profile/user/:userId" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<PublicProfile />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App