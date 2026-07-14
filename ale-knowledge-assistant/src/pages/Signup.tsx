import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useGlobalState } from '../context/GlobalState'
import logo from '../logo.png'

export default function Signup() {
  const navigate = useNavigate()
  const { signup } = useGlobalState()
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Full name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 8) e.password = 'Enter 8 character password'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await signup(name.trim(), email.trim(), '', password)
      navigate('/login', { state: { signupSuccess: true } })
    } catch (err: any) {
      setErrors({ email: err.message || 'Signup failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8"
          style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md overflow-hidden">
              <img src={logo} alt="AL Docbot Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Create your account</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Join AL Docbot</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all dark:bg-gray-800 dark:text-white
                  ${errors.name
                    ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30'
                  }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@ale.com"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all dark:bg-gray-800 dark:text-white
                  ${errors.email
                    ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30'
                  }`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>



            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm outline-none transition-all dark:bg-gray-800 dark:text-white
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
              }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-4">
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} className="text-purple-600 cursor-pointer hover:underline font-semibold">
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
