import { useNavigate } from 'react-router-dom'
import { Brain } from 'lucide-react'

interface SignupProps { onLogin: () => void }

export default function Signup({ onLogin }: SignupProps) {
  const navigate = useNavigate()
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onLogin(); navigate('/dashboard') }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Brain size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white">Create your account</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Join ALE Knowledge Assistant</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Full name</label>
              <input placeholder="Your name" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Work email</label>
              <input type="email" placeholder="you@ale.com" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Department</label>
              <input placeholder="e.g. Network Engineering" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
              <input type="password" placeholder="••••••••" className="input" />
            </div>
            <button type="submit" className="btn-primary w-full">Create account</button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-4">
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} className="text-purple-600 cursor-pointer hover:underline">Sign in</span>
          </p>
        </div>
      </div>
    </div>
  )
}
