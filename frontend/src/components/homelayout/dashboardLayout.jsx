import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './sidebar.jsx'
import BottomNav from './bottom_nav.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

export default function DashboardLayout() {
  const { theme } = useTheme()
  const location = useLocation()
  const isChats = location.pathname === '/chats'

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-950 text-slate-100'
          : 'bg-surface text-slate-800'
      }`}
    >
      <Sidebar />

      {/* Main content — offset by sidebar width on desktop */}
      {/* On mobile Chats page, no bottom padding since chat fills viewport */}
      <main className={`lg:ml-64 ${isChats ? 'h-dvh overflow-hidden' : 'min-h-screen pb-20'} lg:min-h-screen lg:pb-0`}>
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}