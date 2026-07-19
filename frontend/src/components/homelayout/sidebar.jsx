import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  Home, Compass, FolderKanban, MessageCircle,
  Bell, User, LogOut, Users
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/chats', icon: MessageCircle, label: 'Chats', badge: 3 },
  { to: '/notifications', icon: Bell, label: 'Notifications', badge: 5 },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const renderAvatar = () => {
    if (user?.avatar_url) {
      if (user.avatar_url.startsWith('preset:')) {
        const gradient = user.avatar_url.split('preset:')[1]
        return (
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
            {initials}
          </div>
        )
      }
      return (
        <img
          src={user.avatar_url}
          alt={user.name || 'User'}
          className="w-9 h-9 rounded-full object-cover border border-slate-100 shrink-0 shadow-sm"
        />
      )
    }
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
        {initials}
      </div>
    )
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-white border-r border-slate-200 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100 shrink-0">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Users size={18} className="text-white" />
        </div>
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-xl font-extrabold text-slate-800 tracking-tight"
        >
          TeamSync
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User section with logout popover menu */}
      <div className="px-3 py-4 border-t border-slate-100 shrink-0 relative group">
        <div className="absolute bottom-16 left-3 right-3 bg-white border border-slate-100 rounded-2xl shadow-xl p-1.5 z-40 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 origin-bottom ease-out">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors"
          >
            <LogOut size={14} />
            Log Out
          </button>
        </div>

        <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-left border border-transparent hover:bg-slate-50 transition-all cursor-pointer">
          {renderAvatar()}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}