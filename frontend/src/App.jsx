// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// import { Toaster } from 'react-hot-toast'
// import { AuthProvider, useAuth } from './context/AuthContext.jsx'

// import SignIn from './pages/SignIn.jsx'
// import SignUp from './pages/SignUp.jsx'
// import ProtectedRoute from './components/ProtectedRoute.jsx'

// // Placeholder dashboard — will be replaced in Phase 2
// function Dashboard() {
//   const { user, logout } = useAuth()
//   return (
//     <div className="min-h-screen bg-surface flex items-center justify-center">
//       <div className="text-center space-y-4">
//         <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-2">
//           <span className="text-3xl">🎉</span>
//         </div>
//         <h1 className="text-3xl font-bold text-slate-800">Welcome, {user?.name}!</h1>
//         <p className="text-slate-500 text-sm max-w-xs mx-auto">
//           Auth is working. Dashboard is coming in the next phase.
//         </p>
//         <button
//           onClick={logout}
//           className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
//         >
//           Sign Out
//         </button>
//       </div>
//     </div>
//   )
// }

// function App() {
//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         <Toaster
//           position="top-right"
//           toastOptions={{
//             style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
//           }}
//         />
//         <Routes>
//           <Route path="/signin" element={<SignIn />} />
//           <Route path="/signup" element={<SignUp />} />
//           <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
//           <Route path="/" element={<Navigate to="/dashboard" replace />} />
//           <Route path="*" element={<Navigate to="/dashboard" replace />} />
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   )
// }

// export default App
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'

import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './components/homelayout/dashboardLayout.jsx'
import Home from './pages/Home.jsx'
import CompleteProfile from './pages/CompleteProfile.jsx'
import Profile from './pages/Profile.jsx'

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
            <Route index element={<ComingSoon title="Discover" />} />
          </Route>

          <Route path="/projects" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<ComingSoon title="Projects" />} />
          </Route>

          <Route path="/chats" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<ComingSoon title="Chats" />} />
          </Route>

          <Route path="/notifications" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<ComingSoon title="Notifications" />} />
          </Route>

          <Route path="/profile" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Profile />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App