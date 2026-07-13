import { useState } from 'react'
import clsx from 'clsx'
import { useGlobalState } from '../context/GlobalState'
import { updateUserProfile } from '../api/client'

interface SettingsProps {
  dark: boolean
  onToggleDark: () => void
  user: { name: string; display_name?: string; email: string; department: string; profile_picture?: string; role?: string } | null
}

const MODELS = [
  { name: 'Llama 3.2', desc: 'Fast · local · 2B' },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx('w-10 h-5 rounded-full relative transition-colors flex-shrink-0', on ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700')}
    >
      <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', on ? 'left-5' : 'left-0.5')} />
    </button>
  )
}

function SettingRow({ label, sub, right }: { label: string; sub: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div>
        <div className="text-sm text-gray-800 dark:text-gray-200">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
      {right}
    </div>
  )
}

export default function Settings({ dark, onToggleDark, user }: SettingsProps) {
  const { multiDoc, setMultiDoc, showCitations, setShowCitations, updateUser } = useGlobalState()
  const [compact, setCompact] = useState(true)
  const [model, setModel] = useState('Llama 3.2')

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.name || '',
    display_name: user?.display_name || user?.name || '',
    email: user?.email || '',
    profile_picture: user?.profile_picture || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isNormalUser = user?.role !== 'Admin'

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profile_picture: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // Form validation
    if (!formData.username.trim()) {
      setErrorMsg('Username is required.')
      return
    }
    if (!formData.display_name.trim()) {
      setErrorMsg('Display name is required.')
      return
    }
    if (!formData.email.trim()) {
      setErrorMsg('Email is required.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    if (!isNormalUser && formData.new_password) {
      if (!formData.current_password) {
        setErrorMsg('Current password is required to update password.')
        return
      }
      if (formData.new_password.length < 8) {
        setErrorMsg('New password must be at least 8 characters.')
        return
      }
      if (formData.new_password !== formData.confirm_password) {
        setErrorMsg('New passwords do not match.')
        return
      }
    }

    setSaving(true)
    try {
      const res = await updateUserProfile({
        username: formData.username,
        display_name: formData.display_name,
        email: formData.email,
        profile_picture: formData.profile_picture || undefined,
        current_password: (!isNormalUser && formData.current_password) ? formData.current_password : undefined,
        new_password: (!isNormalUser && formData.new_password) ? formData.new_password : undefined
      })

      updateUser(res.user, res.access_token)
      setSuccessMsg('Profile updated successfully.')
      setIsEditing(false)
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your preferences and account</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-50 dark:border-gray-800">Profile</h2>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-3 mt-3">
                {errorMsg && (
                  <div className="p-2.5 text-xs text-red-750 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                    {errorMsg}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Profile picture</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                      {formData.profile_picture ? (
                        <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-755 hover:file:bg-purple-100 cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Username / Name</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full input text-xs py-1.5 px-2.5"
                    placeholder="Username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full input text-xs py-1.5 px-2.5"
                    placeholder="Display Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full input text-xs py-1.5 px-2.5"
                    placeholder="Email"
                  />
                </div>

                {!isNormalUser && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Change Password (optional)</h3>
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={formData.current_password}
                        onChange={e => setFormData(prev => ({ ...prev, current_password: e.target.value }))}
                        placeholder="Current Password"
                        className="w-full input text-xs py-1.5 px-2.5"
                      />
                      <input
                        type="password"
                        value={formData.new_password}
                        onChange={e => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
                        placeholder="New Password"
                        className="w-full input text-xs py-1.5 px-2.5"
                      />
                      <input
                        type="password"
                        value={formData.confirm_password}
                        onChange={e => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder="Confirm New Password"
                        className="w-full input text-xs py-1.5 px-2.5"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setErrorMsg(null)
                      setFormData({
                        username: user?.name || '',
                        display_name: user?.display_name || user?.name || '',
                        email: user?.email || '',
                        profile_picture: user?.profile_picture || '',
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                      })
                    }}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {successMsg && (
                  <div className="mb-3 p-2.5 text-xs text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                    {successMsg}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 overflow-hidden">
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.display_name || user?.name || 'Guest'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email ?? ''}</div>
                    <div className="text-xs text-gray-400">{user?.department ?? ''}</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Edit profile
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isNormalUser ? (
            <div className="card">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1 pb-2 border-b border-gray-50 dark:border-gray-800">Preferences</h2>
              <SettingRow 
                label="Multifile Upload" 
                sub="Enable searching across multiple documents at once" 
                right={<Toggle on={multiDoc} onToggle={() => setMultiDoc(!multiDoc)} />} 
              />
              <SettingRow 
                label="Show source citations" 
                sub="Always display source references in answers" 
                right={<Toggle on={showCitations} onToggle={() => setShowCitations(!showCitations)} />} 
              />
            </div>
          ) : (
            <>
              <div className="card">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1 pb-2 border-b border-gray-50 dark:border-gray-800">Appearance</h2>
                <SettingRow label="Dark mode" sub="Switch to dark theme" right={<Toggle on={dark} onToggle={onToggleDark} />} />
                <SettingRow label="Compact view" sub="Reduce spacing in lists" right={<Toggle on={compact} onToggle={() => setCompact(c => !c)} />} />
              </div>

              <div className="card">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-50 dark:border-gray-800">AI model</h2>
                <div className="grid grid-cols-2 gap-2">
                  {MODELS.map(m => (
                    <div
                      key={m.name}
                      onClick={() => setModel(m.name)}
                      className={clsx(
                        'border rounded-lg p-3 cursor-pointer transition-colors',
                        model === m.name ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200'
                      )}
                    >
                      <div className="text-xs font-medium text-gray-900 dark:text-white">{m.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1 pb-2 border-b border-gray-50 dark:border-gray-800">Search preferences</h2>
                <SettingRow label="Multi-document search" sub="Search across all indexed files" right={<Toggle on={multiDoc} onToggle={() => setMultiDoc(!multiDoc)} />} />
                <SettingRow label="Show source citations" sub="Always display source references" right={<Toggle on={showCitations} onToggle={() => setShowCitations(!showCitations)} />} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
