import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Upload, BookOpen,
  Settings, LogOut, Brain, Bell, Moon, Sun, Search
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'AI Assistant', icon: MessageSquare, badge: 'New' },
  { to: '/upload', label: 'Upload docs', icon: Upload },
  { to: '/knowledge-base', label: 'Knowledge base', icon: BookOpen },
]

interface LayoutProps {
  children: ReactNode
  onLogout: () => void
  dark: boolean
  onToggleDark: () => void
}

export default function Layout({ children, onLogout, dark, onToggleDark }: LayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#1F1B2E' }}>
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white text-sm font-medium leading-tight">ALE Knowledge</div>
            <div className="text-white/40 text-xs">Enterprise AI</div>
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
                <span className="text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
          <div className="text-white/30 text-xs uppercase tracking-wider px-2 py-2 mt-3">Account</div>
          <NavLink
            to="/settings"
            className={({ isActive }) => clsx('sidebar-item mb-0.5', isActive && 'active')}
          >
            <Settings size={16} />
            Settings
          </NavLink>
          <button
            onClick={() => { onLogout(); navigate('/login') }}
            className="sidebar-item w-full text-left"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </nav>

        <div className="p-2 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              TK
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">Thirumalaikumar</div>
              <div className="text-white/40 text-xs truncate">Intern · Network Eng.</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 max-w-xs">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
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
          <button className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 relative">
            <Bell size={15} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium cursor-pointer">
            TK
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
