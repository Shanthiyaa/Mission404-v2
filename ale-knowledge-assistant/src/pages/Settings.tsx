import { useState } from 'react'
import clsx from 'clsx'
import { useGlobalState } from '../context/GlobalState'
import { updateUserProfile, freeUpSpace } from '../api/client'
import { User, HardDrive } from 'lucide-react'

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
  const { multiDoc, setMultiDoc, showCitations, setShowCitations, updateUser, documents, refreshDocuments } = useGlobalState()
  const [compact, setCompact] = useState(true)
  const [model, setModel] = useState('Llama 3.2')

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'storage'>('profile')

  // Storage States
  const [deletingStorage, setDeletingStorage] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [storageSuccess, setStorageSuccess] = useState<string | null>(null)

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

  const usedBytes = documents.reduce((sum, d) => sum + (d.size_bytes || 0), 0)
  const limitBytes = 512 * 1024 * 1024 // 512 MB

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const handleFreeUpSpace = async () => {
    setStorageError(null)
    setStorageSuccess(null)

    const confirmed = window.confirm("Are you sure you want to remove all files from your knowledge base?")
    if (!confirmed) return

    setDeletingStorage(true)
    try {
      await freeUpSpace()
      setStorageSuccess("All files have been removed from your knowledge base. Your storage is now 0 MB / 512 MB.")
      await refreshDocuments()
    } catch (err: any) {
      setStorageError(err.message || "Failed to remove files. Please try again.")
    } finally {
      setDeletingStorage(false)
    }
  }

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

      {/* Settings Navigation Tabs */}
      <div className="flex gap-4 border-b border-gray-250 dark:border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={clsx(
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors relative top-[1px]',
            activeTab === 'profile'
              ? 'border-purple-650 text-purple-650 dark:text-purple-400 dark:border-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Profile & Preferences
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={clsx(
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors relative top-[1px]',
            activeTab === 'storage'
              ? 'border-purple-650 text-purple-650 dark:text-purple-400 dark:border-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          Storage
        </button>
      </div>

      {activeTab === 'profile' ? (
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
                          <User size={18} className="text-purple-100" />
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
                        <User size={22} className="text-purple-100" />
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
      ) : (
        /* Storage Dashboard Tab */
        <div className="max-w-xl">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-50 dark:border-gray-800">
              <HardDrive size={20} className="text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Storage Management</h2>
            </div>

            {storageError && (
              <div className="mb-4 p-3 text-xs text-red-750 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                {storageError}
              </div>
            )}

            {storageSuccess && (
              <div className="mb-4 p-3 text-xs text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                {storageSuccess}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Manage the storage space for your knowledge base. Uploaded files are chunked and indexed into vectors to generate chat answers.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Storage Used</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatBytes(usedBytes)} / {isNormalUser ? '512 MB' : 'Unlimited (Admin)'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-500"
                    style={{ width: `${isNormalUser ? Math.min((usedBytes / limitBytes) * 100, 100) : 0}%` }}
                  />
                </div>

                {isNormalUser && (
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>{((usedBytes / limitBytes) * 100).toFixed(1)}% Used</span>
                    <span>{formatBytes(Math.max(limitBytes - usedBytes, 0))} Remaining</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-50 dark:border-gray-800 pt-4" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Free Up Space</h3>
                  <p className="text-[11px] text-gray-400 leading-normal mt-0.5">
                    Remove all uploaded files and FAISS vector index entries from your knowledge base. This will not delete your chat history, account, or settings.
                  </p>
                </div>
                <button
                  onClick={handleFreeUpSpace}
                  disabled={deletingStorage || usedBytes === 0}
                  className={clsx(
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-all",
                    usedBytes === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-650"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow active:scale-95 cursor-pointer"
                  )}
                >
                  {deletingStorage ? 'Clearing...' : 'Free Up Space'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
