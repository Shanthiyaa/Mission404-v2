import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { getActivity } from '../api/client'
import type { ActivityItem } from '../types'

export default function Notification() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = async () => {
    setLoading(true)
    setError(null)
    try {
      const a = await getActivity()
      setActivity(a)
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()
  }, [])

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Recent system activities and alerts.</p>
        </div>
        <button
          onClick={fetchActivity}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Recent activity</h2>
        </div>

        {loading && activity.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse py-1">
                <div className="w-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700 mt-1.5 flex-shrink-0" />
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="w-10 h-3 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No notifications yet.</p>
        ) : (
          <div className="space-y-0">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.color}`} />
                <div className="flex-1 text-xs text-gray-700 dark:text-gray-300">{a.text}</div>
                <div className="text-xs text-gray-400 flex-shrink-0">{a.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
