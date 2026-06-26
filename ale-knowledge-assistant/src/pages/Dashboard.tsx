import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Files, MessageSquare, BarChart3, Users, TrendingUp, FileText, RefreshCw, AlertCircle, Loader } from 'lucide-react'
import { getStats, getActivity } from '../api/client'
import { useDocuments } from '../hooks/useDocuments'
import type { Stats, ActivityItem } from '../types'

export default function Dashboard() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [statsErr, setStatsErr] = useState<string | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const { documents, loading: docsLoading } = useDocuments()
  const recentDocs = documents.slice(0, 3)

  const fetchAll = async () => {
    setLoadingStats(true)
    setStatsErr(null)
    try {
      const [s, a] = await Promise.all([getStats(), getActivity()])
      setStats(s)
      setActivity(a)
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
          label: 'Avg. confidence',
          value: stats.total_queries > 0 ? `${stats.avg_confidence}%` : '—',
          sub:   stats.total_queries > 0 ? 'across queries' : 'no queries yet',
          up:    true,
          icon:  BarChart3,
          color: 'bg-amber-50 text-amber-600',
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
          <a href="/knowledge-base" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
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
      <div className="grid grid-cols-4 gap-3 mb-5">
        {loadingStats && !stats
          ? Array.from({ length: 4 }).map((_, i) => (
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

      <div className="grid grid-cols-2 gap-4">
        {/* ── Recent activity ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">Recent activity</h2>
          </div>

          {loadingStats && activity.length === 0 ? (
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
            <p className="text-xs text-gray-400 py-4 text-center">No activity yet. Upload a document or ask a question.</p>
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

        {/* ── Recent documents ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">Recent documents</h2>
            <Link to="/knowledge-base" className="text-xs text-purple-600 hover:underline">View all</Link>

          </div>

          {docsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="py-6 text-center">
              <FileText size={24} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No documents yet. Upload a PDF to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDocs.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    {d.status === 'Processing'
                      ? <Loader size={14} className="text-purple-400 animate-spin" />
                      : <FileText size={15} className="text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.size} · {d.pages} pages · {d.date}</div>
                  </div>
                  <span className={`badge ${
                    d.status === 'Indexed'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : d.status === 'Failed'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
