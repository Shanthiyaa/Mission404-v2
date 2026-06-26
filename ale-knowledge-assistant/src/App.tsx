import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Upload from './pages/Upload'
import KnowledgeBase from './pages/KnowledgeBase'
import Settings from './pages/Settings'

interface UserInfo {
  name: string
  email: string
  department: string
}

export default function App() {
  const [dark, setDark] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)

  const toggleDark = () => {
    setDark(d => !d)
    document.documentElement.classList.toggle('dark')
  }

  const handleLogin = (u: UserInfo) => {
    setUser(u)
    setAuthed(true)
  }

  const handleLogout = () => {
    setUser(null)
    setAuthed(false)
  }

  if (!authed) {
    return (
      <BrowserRouter>
        <div className={dark ? 'dark' : ''}>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} onToggleDark={toggleDark} />} />
            <Route path="/signup" element={<Signup onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className={dark ? 'dark' : ''}>
        <Layout onLogout={handleLogout} dark={dark} onToggleDark={toggleDark} user={user}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/settings" element={<Settings dark={dark} onToggleDark={toggleDark} user={user} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </div>
    </BrowserRouter>
  )
}
