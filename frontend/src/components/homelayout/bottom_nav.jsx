import { NavLink, useLocation } from 'react-router-dom'
import { Home, Compass, FolderKanban, MessageCircle, User } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext.jsx'

export default function BottomNav() {
  const location = useLocation()
  const { notifications } = useNotifications()

  const unreadMessages = notifications.filter(n => n.type === 'message' && !n.read).length

  const NAV_ITEMS = [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/discover', icon: Compass, label: 'Discover' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadMessages || null },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <div className="relative">
                <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}