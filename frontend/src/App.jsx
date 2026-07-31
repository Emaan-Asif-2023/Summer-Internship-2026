import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

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
function ComingSoon({ title }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🚧</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {title}
      </h1>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">
        This page is under construction. Check back soon!
      </p>
    </div>
  )
}

function App() {
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