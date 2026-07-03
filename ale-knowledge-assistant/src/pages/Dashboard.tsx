import { useState, useEffect } from 'react'
import { Files, MessageSquare, Users, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import { getStats } from '../api/client'
import type { Stats } from '../types'

export default function Dashboard() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [statsErr, setStatsErr] = useState<string | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const fetchAll = async () => {
    setLoadingStats(true)
    setStatsErr(null)
    try {
      const s = await getStats()
      setStats(s)
    } catch (e: any) {
      setStatsErr(e.message || 'Failed to load stats')
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statCards = stats
    ? [
        {
          label: 'Total documents',
          value: String(stats.total_documents),
          sub:   `${stats.indexed_documents} indexed`,
          up:    true,
          icon:  Files,
          color: 'bg-purple-50 text-purple-600',
        },
        {
          label: 'Queries answered',
          value: String(stats.total_queries),
          sub:   'this session',
          up:    true,
          icon:  MessageSquare,
          color: 'bg-green-50 text-green-600',
        },
        {
          label: 'Active users',
          value: String(stats.active_users),
          sub:   'current session',
          up:    true,
          icon:  Users,
          color: 'bg-purple-50 text-purple-600',
        },
      ]
    : []

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <a href="/knowledge-base" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold">
            View all
          </a>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's what's happening with your knowledge base today.</p>
        </div>
        <button
          onClick={fetchAll}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loadingStats ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error banner */}
      {statsErr && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={14} />
          Backend not reachable — showing cached data. Start the API server with <code className="mx-1 font-mono text-xs">uvicorn api:app --reload</code>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {loadingStats && !stats
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3 mb-2" />
                <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mb-1" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))
          : statCards.map(s => (
              <div key={s.label} className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</div>
                    <div className="text-2xl font-medium text-gray-900 dark:text-white">{s.value}</div>
                    <div className="text-xs mt-1 flex items-center gap-1 text-green-600">
                      <TrendingUp size={11} />
                      {s.sub}
                    </div>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
