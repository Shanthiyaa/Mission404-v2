import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Brain, Building2, Search, FileText, Quote, Zap,
  Shield, ChevronRight, Eye, EyeOff, ArrowRight,
  CheckCircle2, Users, Database, Clock
} from 'lucide-react'

interface LoginProps { onLogin: (user: { name: string; email: string; department: string }) => void; onToggleDark: () => void }

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
    title: 'Enterprise-Grade',
    desc: 'Data stays on your infrastructure. No external API calls. Full control.',
  },
]

const STATS = [
  { value: '10x', label: 'Faster than manual search', icon: Zap },
  { value: '95%', label: 'Answer accuracy rate', icon: CheckCircle2 },
  { value: '<2s', label: 'Average response time', icon: Clock },
  { value: '100+', label: 'Document formats supported', icon: Database },
]

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode]           = useState<AuthMode>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [forgotSent, setForgotSent] = useState(false)
  const [loading, setLoading]     = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [showSuccess, setShowSuccess] = useState(!!location.state?.signupSuccess)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (mode !== 'forgot') {
      if (!password) e.password = 'Password is required'
      else if (password.length < 8) e.password = 'Enter 8 character password'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (mode === 'forgot') { setForgotSent(true); return }

    if (mode === 'login') {
      setLoading(true)
      await new Promise(r => setTimeout(r, 600))
      setLoading(false)

      // Check against registered users in localStorage
      let users: Array<{ name: string; email: string; department: string; password: string }> = []
      try {
        users = JSON.parse(localStorage.getItem('ale_users') || '[]')
        if (!Array.isArray(users)) users = []
      } catch (err) {
        users = []
      }
      
      const matchedUser = users.find(u => u.email === email)

      if (!matchedUser) {
        setErrors({ email: 'register before login' })
        return
      }
      if (matchedUser.password !== password) {
        setErrors({ password: 'Incorrect password. Please try again.' })
        return
      }

      onLogin({ name: matchedUser.name, email: matchedUser.email, department: matchedUser.department })
      navigate('/dashboard')
    }
  }

  const switchMode = (m: AuthMode) => {
    setMode(m); setErrors({}); setForgotSent(false)
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
            <Brain size={20} color="white" />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
              ALE Knowledge
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Alcatel-Lucent Enterprise
            </div>
          </div>
        </div>

        {/* Middle: Hero */}
        <div className="relative z-10">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px', padding: '4px 12px',
            marginBottom: '24px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a3e635' }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 500 }}>
              RAG-powered · Local LLM · Zero data leakage
            </span>
          </div>

          <h1 style={{
            fontSize: '44px', fontWeight: 700, lineHeight: 1.12,
            color: 'white', letterSpacing: '-0.03em', marginBottom: '16px',
          }}>
            Your enterprise<br />
            documents,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #c4b5fd, #f0abfc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              finally intelligent
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: '16px',
            lineHeight: 1.6, maxWidth: '440px', marginBottom: '36px',
          }}>
            Stop digging through folders. Ask a question, get a precise answer
            with the exact page and section it came from — in under 2 seconds.
          </p>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
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

        {/* Bottom: Testimonial */}
        <div className="relative z-10" style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', padding: '16px 20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'white', fontWeight: 700, fontSize: '13px',
            }}>
              TK
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', lineHeight: 1.5 }}>
                "Found the answer to a 3-hour search in 8 seconds. The citation was on the exact page."
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '3px' }}>
                Thirumalaikumar · Network Engineering Intern
              </div>
            </div>
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
              <Brain size={18} color="white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-[15px]">ALE Knowledge</div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Alcatel-Lucent Enterprise</div>
            </div>
          </div>

          {/* Auth card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8"
            style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}>

            {/* Header */}
            <div className="mb-6">
              {mode === 'login' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Welcome back</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your ALE Knowledge account</p>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Reset password</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We'll send a reset link to your email</p>
                </>
              )}
            </div>

            {showSuccess && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl text-sm flex items-center gap-3">
                <CheckCircle2 size={18} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <div className="flex-1 leading-normal">
                  Account created successfully! Please sign in.
                </div>
                <button onClick={() => setShowSuccess(false)} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 font-semibold text-lg leading-none">
                  &times;
                </button>
              </div>
            )}

            {/* Forgot success state */}
            {forgotSent ? (
              <div className="text-center py-6">
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(124,58,237,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle2 size={28} color="#7c3aed" />
                </div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">Check your email</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  We've sent a reset link to <strong>{email}</strong>
                </p>
                <button
                  onClick={() => switchMode('login')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Work email
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

                {/* Password */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm outline-none transition-all
                          dark:bg-gray-800 dark:text-white
                          ${errors.password
                            ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                            : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30'
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                  </div>
                )}

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
                      {mode === 'login' && 'Sign in'}
                      {mode === 'forgot' && 'Send reset link'}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider + SSO */}
            {!forgotSent && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100 dark:border-gray-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // SSO: create a guest session
                    const ssoUser = { name: 'ALE SSO User', email: 'sso@ale.com', department: 'ALE' }
                    onLogin(ssoUser)
                    navigate('/dashboard')
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  <Building2 size={15} className="text-purple-600" />
                  Continue with ALE SSO
                </button>
              </>
            )}

            {/* Mode switcher */}
            {!forgotSent && (
              <p className="text-center text-xs text-gray-500 mt-5">
                {mode === 'login' ? (
                  <>Don't have an account?{' '}
                    <button onClick={() => navigate('/signup')} className="text-purple-600 font-semibold hover:text-purple-700">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button onClick={() => switchMode('login')} className="text-purple-600 font-semibold hover:text-purple-700">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-5">
            © 2026 Alcatel-Lucent Enterprise · Internal tool · Confidential
          </p>
        </div>
      </div>
    </div>
  )
}
