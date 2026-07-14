import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Upload, BookOpen,
  Settings, LogOut, Brain, Bell, Moon, Sun, Search, Shield, User
} from 'lucide-react'
import clsx from 'clsx'
import { useGlobalState } from '../context/GlobalState'
import logo from '../logo.png'

const NAV: { to: string; label: string; icon: any; badge?: string }[] = [
  { to: '/upload', label: 'Upload Document', icon: Upload },
  { to: '/chat', label: 'AL Docbot', icon: MessageSquare },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface LayoutProps {
  children: ReactNode
  onLogout: () => void
  dark: boolean
  onToggleDark: () => void
  user: { name: string; email: string; department: string; role?: string; profile_picture?: string } | null
}

export default function Layout({ children, onLogout, dark, onToggleDark, user }: LayoutProps) {
  const navigate = useNavigate()
  const { unreadCount } = useGlobalState()

  // Compute initials from full name
  const initials = user
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const displayName = user?.name ?? 'Guest'
  const displayDept = user?.department ?? ''

  const [headerSearch, setHeaderSearch] = useState('')

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && headerSearch.trim()) {
      navigate(`/knowledge-base?q=${encodeURIComponent(headerSearch.trim())}`)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <aside className="w-56 flex-shrink-0 flex flex-col no-print" style={{ background: '#1F1B2E' }}>
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={logo} alt="AL Docbot Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white text-sm font-medium leading-tight">AL Docbot</div>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="text-white/30 text-xs uppercase tracking-wider px-2 py-2 mt-1">Main</div>
          {NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-item mb-0.5', isActive && 'active')
              }
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-xs bg-purple-50 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
          
          {user?.role === 'Admin' && (
            <>
              <div className="text-white/30 text-xs uppercase tracking-wider px-2 py-2 mt-3">Administration</div>
              <NavLink
                to="/users"
                className={({ isActive }) => clsx('sidebar-item mb-0.5', isActive && 'active')}
              >
                <Shield size={16} />
                User Management
              </NavLink>
            </>
          )}

          <div className="mt-3 pt-2 border-t border-white/5">
            <button
              onClick={() => { onLogout(); navigate('/login') }}
              className="sidebar-item w-full text-left"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </nav>

        <div className="p-2 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer" onClick={() => navigate('/settings')}>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-purple-100" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{displayName}</div>
              <div className="text-white/40 text-xs truncate">{user?.role || ''}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-3 flex-shrink-0 no-print">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 max-w-xs">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              value={headerSearch}
              onChange={e => setHeaderSearch(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Search documents..."
              className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none w-full placeholder-gray-400"
            />
          </div>
          <button
            onClick={onToggleDark}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 relative"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/settings')}>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Hello, {displayName}!
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-purple-100" />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}