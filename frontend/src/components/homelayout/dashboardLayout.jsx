import { Outlet } from 'react-router-dom'
import Sidebar from './sidebar.jsx'
import BottomNav from './bottom_nav.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

export default function DashboardLayout() {
  const { theme } = useTheme()

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
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}