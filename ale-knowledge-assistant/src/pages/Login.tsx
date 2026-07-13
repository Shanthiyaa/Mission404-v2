import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Brain, Search, FileText, Quote, Zap,
  Shield, Eye, EyeOff, ArrowRight,
  CheckCircle2, Database
} from 'lucide-react'
import { useGlobalState } from '../context/GlobalState'
import logo from '../logo.png'

interface LoginProps { onToggleDark: () => void }

type AuthMode = 'login' | 'forgot'

const FEATURES = [
  {
    icon: Search,
    title: 'Semantic Search',
    desc: 'Ask questions in plain English. Find answers across all your enterprise documents instantly.',
  },
  {
    icon: Quote,
    title: 'Cited Answers',
    desc: 'Every response includes the exact document, page, and section it came from.',
  },
  {
    icon: FileText,
    title: 'Multi-Format Support',
    desc: 'PDF, DOCX, PPTX, Excel and more — upload once, query forever.',
  },
  {
    icon: Shield,
    title: 'Locked-Down Privacy',
    desc: 'Your documents are processed in a completely isolated environment.',
  },
]

const STATS = [
  { value: '100x', label: 'Faster than manual search', icon: Zap },
  { value: '90+', label: 'documents supported', icon: Database },
]
export default function Login() {
  const { loginRegular } = useGlobalState()
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState('Technical Specialist')
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [showSuccess, setShowSuccess] = useState(!!location.state?.signupSuccess)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (role === 'Admin') {
      navigate('/admin-login')
      return
    }

    setLoading(true)
    try {
      await loginRegular(name.trim(), email.trim(), role)
      navigate('/upload')
    } catch (err: any) {
      setErrors({ email: err.message || 'Login failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT: Landing / Branding ─────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[58%] relative overflow-hidden p-12"
        style={{
          background: 'linear-gradient(135deg, #1e0a3c 0%, #3b0764 40%, #581c87 70%, #7c3aed 100%)',
        }}
      >
        {/* Subtle background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', top: '-80px', left: '-80px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-100px', right: '-60px',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', top: '45%', left: '55%',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(109,40,217,0.2) 0%, transparent 70%)',
          }} />
        </div>

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <img src={logo} alt="AL Docbot Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
              AL Docbot
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Alcatel Lucent
            </div>
          </div>
        </div>

        {/* Middle: Hero */}
        <div className="relative z-10">

          <h1 style={{
            fontSize: '44px', fontWeight: 700, lineHeight: 1.12,
            color: 'white', letterSpacing: '-0.03em', marginBottom: '16px',
          }}>
            <span style={{
              background: 'linear-gradient(90deg, #c4b5fd, #f0abfc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Ask - Discover - Resolve
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: '16px',
            lineHeight: 1.6, maxWidth: '440px', marginBottom: '36px',
          }}>
            Intelligent document retrieval starts with a question and ends with a source-backed answer.
          </p>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px', marginBottom: '40px',
          }}>
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={value} style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '14px 12px',
                backdropFilter: 'blur(8px)',
              }}>
                <Icon size={16} color="rgba(196,181,253,0.9)" style={{ marginBottom: '6px' }} />
                <div style={{ color: 'white', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>
                  {value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', lineHeight: 1.3, marginTop: '2px' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', padding: '16px',
                backdropFilter: 'blur(6px)',
                transition: 'background 0.2s',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(167,139,250,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px',
                }}>
                  <Icon size={16} color="#c4b5fd" />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                  {title}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.5 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── RIGHT: Auth Card ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={logo} alt="AL Docbot Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-[15px]">AL Docbot</div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Alcatel Lucent</div>
            </div>
          </div>

          {/* Auth card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8"
            style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">AL Docbot Portal</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select your role to access the assistant</p>
            </div>

            {showSuccess && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl text-sm flex items-center gap-3">
                <CheckCircle2 size={18} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <div className="flex-1 leading-normal">
                  Admin account created successfully! Please sign in.
                </div>
                <button onClick={() => setShowSuccess(false)} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 font-semibold text-lg leading-none">
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all
                    dark:bg-gray-800 dark:text-white
                    ${errors.name
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30'
                    }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@ale.com"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all
                    dark:bg-gray-800 dark:text-white
                    ${errors.email
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30'
                    }`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Your Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all cursor-pointer"
                >
                  <option value="Technical Specialist">Technical Specialist</option>
                  <option value="Senior Technical Specialist">Senior Technical Specialist</option>
                  <option value="Tech Manager">Tech Manager</option>
                  <option value="Senior Tech Manager">Senior Tech Manager</option>
                  <option value="Director">Director</option>
                  <option value="TEC Expert">TEC Expert</option>
                  <option value="TAC Assistant">TAC Assistant</option>
                  <option value="VIP Expert">VIP Expert</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all"
                style={{
                  background: loading
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                  boxShadow: loading ? 'none' : '0 2px 12px rgba(124,58,237,0.4)',
                }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {role === 'Admin' ? 'Continue to Admin Login' : 'Enter Application'}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>


        </div>
      </div>
    </div>
  )
}
