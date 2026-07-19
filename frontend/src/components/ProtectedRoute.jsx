import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading TeamSync...</p>
        </div>
      </div>
    )
  }

  if (!token) return <Navigate to="/signin" replace />

  // If user has not completed profile, redirect them to /complete-profile
  if (user && !user.profile_completed && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  // If user has completed profile, block them from visiting /complete-profile
  if (user && user.profile_completed && location.pathname === '/complete-profile') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
