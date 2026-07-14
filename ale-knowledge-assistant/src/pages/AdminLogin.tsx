import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, FileText } from 'lucide-react'
import { useGlobalState } from '../context/GlobalState'
import logo from '../logo.png'

interface AdminLoginProps {
  onToggleDark?: () => void
}

const BG_ICONS = [
  { name: 'PDF', top: '18%', left: '10%', animClass: 'float-bg-a', delay: '0s' },
  { name: 'ZIP', top: '42%', left: '20%', animClass: 'float-bg-b', delay: '1s' },
  { name: 'DOCX', top: '68%', left: '12%', animClass: 'float-bg-c', delay: '2s' },
  { name: 'Word', top: '20%', right: '12%', animClass: 'float-bg-b', delay: '0.5s' },
  { name: 'XLSX', top: '45%', right: '18%', animClass: 'float-bg-c', delay: '1.5s' },
  { name: 'PPT', top: '70%', right: '10%', animClass: 'float-bg-a', delay: '2.5s' }
]

const LIGHT_PARTICLES = [
  { top: '15%', left: '15%', size: '8px', delay: '0s', duration: '8s' },
  { top: '55%', left: '25%', size: '12px', delay: '2s', duration: '12s' },
  { top: '35%', right: '22%', size: '10px', delay: '1s', duration: '10s' },
  { top: '80%', right: '30%', size: '8px', delay: '3s', duration: '7s' },
  { top: '10%', right: '45%', size: '14px', delay: '4s', duration: '15s' },
]

export default function AdminLogin({ onToggleDark }: AdminLoginProps) {
  const { login } = useGlobalState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email.trim()) {
      e.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      e.email = 'Enter a valid email'
    }
    if (!password) {
      e.password = 'Password is required'
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password)
      navigate('/upload')
    } catch (err: any) {
      setErrors({ email: err.message || 'Incorrect email or password.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-white"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #faf5ff 100%)',
      }}
    >
      {/* Dots grid overlay */}
      <div className="absolute inset-0 pointer-events-none bg-dot-pattern opacity-70" />

      {/* Soft glowing purple background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '10%', left: '10%',
          width: '450px', height: '450px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pulse-orb 15s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(237, 233, 254, 0.4) 0%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'pulse-orb 20s ease-in-out infinite alternate-reverse',
        }} />

        {/* Minimal floating particles / soft glowing lights */}
        {LIGHT_PARTICLES.map((p, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-purple-400/20 blur-[1px] animate-pulse"
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              boxShadow: '0 0 10px rgba(167, 139, 250, 0.4)',
            }}
          />
        ))}
      </div>

      {/* Floating background document particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BG_ICONS.map(({ name, top, left, right, animClass, delay }) => (
          <div
            key={name}
            className={`hidden md:block absolute ${animClass}`}
            style={{
              top,
              left,
              right,
              animationDelay: delay,
              zIndex: 1,
            }}
          >
            <div className="floating-bg-particle flex flex-col items-center justify-center pointer-events-auto">
              <FileText size={18} className="text-purple-600 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-700 mt-1">
                {name}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="w-full max-w-[460px] relative z-10">
        {/* Glow border wrapper */}
        <div className="admin-glow-card-light rounded-2xl p-[1px] overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(139, 92, 246, 0.1) 100%)',
        }}>
          {/* Glassmorphic card body */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
            
            {/* Security Indicator */}
            <div className="text-center mb-6">
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(124, 58, 237, 0.06)',
                border: '1px solid rgba(124, 58, 237, 0.15)',
                borderRadius: '20px',
                padding: '5px 12px',
                fontSize: '11px',
                color: '#7c3aed',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#7c3aed',
                  boxShadow: '0 0 6px #7c3aed',
                }} className="animate-pulse" />
                Secure Admin Access
              </div>
            </div>

            {/* Glowing Logo & Title */}
            <div className="text-center mb-6">
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(124, 58, 237, 0.15)',
                margin: '0 auto 16px auto',
                overflow: 'hidden',
              }}>
                <img src={logo} alt="AL Docbot Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.4)' }} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">AL Docbot</h2>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Alcatel Lucent</p>
              <p className="text-sm text-gray-500 mt-2">
                Sign in to manage users and system settings
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@alcatel.com"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all
                    bg-white text-gray-900 placeholder-gray-400
                    ${errors.email
                      ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                    }`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm outline-none transition-all
                      bg-white text-gray-900 placeholder-gray-400
                      ${errors.password
                        ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* Submit Button with Hover Glow */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.01]"
                style={{
                  background: loading
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.25)',
                }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In Admin
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
              <p className="text-center text-xs text-gray-500">
                Need an admin account?{' '}
                <button onClick={() => navigate('/signup')} className="text-purple-600 font-semibold hover:text-purple-700 hover:underline">
                  Sign up
                </button>
              </p>

              <p className="text-center text-xs text-gray-500">
                <button onClick={() => navigate('/login')} className="text-purple-600 font-medium hover:text-purple-700 hover:underline">
                  ← Back to landing role selection
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
