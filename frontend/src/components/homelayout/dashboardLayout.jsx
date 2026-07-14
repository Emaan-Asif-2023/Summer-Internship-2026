import { Outlet } from 'react-router-dom'
import Sidebar from './sidebar.jsx'
import BottomNav from './bottom_nav.jsx'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}