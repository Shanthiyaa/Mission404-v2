import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Signup from './pages/Signup'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Upload from './pages/Upload'
import KnowledgeBase from './pages/KnowledgeBase'
import Settings from './pages/Settings'
import Notification from './pages/Notification'
import DocPreview from './pages/DocPreview'
import UserManagement from './pages/UserManagement'
import { GlobalStateProvider, useGlobalState } from './context/GlobalState'

function AppContent({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const { token, user, authLoading, logout } = useGlobalState()

  if (authLoading) {
    return null
  }

  if (!token || !user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin onToggleDark={toggleDark} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/preview" element={<DocPreview />} />
      <Route path="*" element={
        <Layout onLogout={logout} dark={dark} onToggleDark={toggleDark} user={user}>
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/settings" element={<Settings dark={dark} onToggleDark={toggleDark} user={user} />} />
            {user.role === 'Admin' && (
              <Route path="/users" element={<UserManagement />} />
            )}
            <Route path="/notifications" element={<Notification />} />
            <Route path="*" element={<Navigate to="/upload" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default function App() {
  const [dark, setDark] = useState(false)

  const toggleDark = () => {
    setDark(d => !d)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <GlobalStateProvider>
      <BrowserRouter>
        <div className={dark ? 'dark' : ''}>
          <AppContent dark={dark} toggleDark={toggleDark} />
        </div>
      </BrowserRouter>
    </GlobalStateProvider>
  )
}
