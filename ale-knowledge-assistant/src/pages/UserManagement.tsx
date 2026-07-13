import { useEffect, useState } from 'react'
import { Search, Trash2, RefreshCw, UserCheck, AlertCircle, Loader } from 'lucide-react'
import clsx from 'clsx'
import { adminListUsers, adminDeleteUser } from '../api/client'
import type { UserItem } from '../api/client'

export default function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminListUsers()
      setUsers(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove user "${name}" and all of their uploaded documents from the platform?`)) return
    setDeletingId(userId)
    try {
      await adminDeleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = users.filter(u => {
    const term = search.toLowerCase()
    return (
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role && u.role.toLowerCase().includes(term))
    )
  })

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage enterprise portal users and access privileges</p>
        </div>
        <button
          onClick={fetchUsers}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 w-64">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none w-full placeholder-gray-400"
            />
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {loading ? 'Loading…' : `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && users.length === 0 && (
          <div className="p-8 text-center">
            <Loader size={20} className="text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading user list…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center">
            <UserCheck size={28} className="text-gray-250 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {users.length === 0
                ? 'No users registered on the platform.'
                : 'No users match your search criteria.'}
            </p>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['User Name', 'Email', 'Role', 'Created Date', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 last:border-0 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-850 dark:text-gray-200 font-medium">{u.username}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', u.role === 'Admin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300')}>
                      {u.role || 'Normal User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      disabled={deletingId === u.id}
                      className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 inline-flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete User"
                    >
                      {deletingId === u.id
                        ? <Loader size={12} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
