import { useState, useEffect } from 'react'
import { Files, MessageSquare, TrendingUp, RefreshCw, AlertCircle, Loader } from 'lucide-react'
import { getStats } from '../api/client'
import type { Stats } from '../types'

// ── SVG Chart Components ───────────────────────────────────────────────────

function LineChart({ data }: { data: { date: string; count: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * 340 + 30 : 200
    const y = 150 - (d.count / maxVal) * 100
    return { x, y, date: d.date, count: d.count }
  })
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`
    : ''

  const id = useState(() => Math.random().toString(36).slice(2))[0]

  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox="0 0 400 170" className="w-full max-w-[400px] h-40 overflow-visible">
        <defs>
          <linearGradient id={`lineGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9333ea" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Horizontal grid lines */}
        <line x1="20" y1="50" x2="380" y2="50" className="stroke-gray-100 dark:stroke-gray-800" strokeDasharray="3" />
        <line x1="20" y1="100" x2="380" y2="100" className="stroke-gray-100 dark:stroke-gray-800" strokeDasharray="3" />
        <line x1="20" y1="150" x2="380" y2="150" className="stroke-gray-200 dark:stroke-gray-700" />
        
        {areaD && <path d={areaD} fill={`url(#lineGrad-${id})`} />}
        {pathD && <path d={pathD} fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        
        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r="3.5" className="fill-purple-600 stroke-white dark:stroke-gray-900 stroke-[1.5px] cursor-pointer hover:r-5 transition-all" />
            <text x={p.x} y={p.y - 8} className="text-[10px] font-semibold fill-purple-600 dark:fill-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" textAnchor="middle">
              {p.count}
            </text>
            {(i === 0 || i === points.length - 1 || points.length <= 6) && (
              <text x={p.x} y="164" className="text-[9px] fill-gray-400 dark:fill-gray-500 font-medium" textAnchor="middle">
                {p.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const barWidth = data.length > 0 ? Math.min(240 / data.length, 24) : 24
  const gap = data.length > 0 ? (350 - barWidth * data.length) / (data.length + 1) : 10
  
  const bars = data.map((d, i) => {
    const x = 30 + gap + i * (barWidth + gap)
    const height = (d.count / maxVal) * 100
    const y = 150 - height
    return { x, y, w: barWidth, h: height, count: d.count, date: d.date }
  })

  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox="0 0 400 170" className="w-full max-w-[400px] h-40 overflow-visible">
        {/* Horizontal grid lines */}
        <line x1="20" y1="50" x2="380" y2="50" className="stroke-gray-100 dark:stroke-gray-800" strokeDasharray="3" />
        <line x1="20" y1="100" x2="380" y2="100" className="stroke-gray-100 dark:stroke-gray-800" strokeDasharray="3" />
        <line x1="20" y1="150" x2="380" y2="150" className="stroke-gray-200 dark:stroke-gray-700" />
        
        {bars.map((b, i) => (
          <g key={i} className="group cursor-pointer">
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h || 1}
              rx="2"
              className="fill-purple-500/80 hover:fill-purple-600 transition-colors"
            />
            <text x={b.x + b.w / 2} y={b.y - 6} className="text-[10px] font-semibold fill-purple-600 dark:fill-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" textAnchor="middle">
              {b.count}
            </text>
            {(i === 0 || i === bars.length - 1 || bars.length <= 7) && (
              <text x={b.x + b.w / 2} y="164" className="text-[9px] fill-gray-400 dark:fill-gray-500 font-medium" textAnchor="middle">
                {b.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function PieChart({ data }: { data: { category: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  let cumulativePercent = 0
  
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent)
    const y = Math.sin(2 * Math.PI * percent)
    return [x, y]
  }
  
  const CAT_LABELS: Record<string, string> = {
    'user_guide': 'User Guides',
    'release_note': 'Release Notes',
    'sqa': 'SQA',
    'kcs': 'KCS',
    'unknown': 'Unknown'
  }

  const slices = data.map((d, i) => {
    const startPercent = cumulativePercent
    cumulativePercent += d.count / (total || 1)
    const endPercent = cumulativePercent

    const [startX, startY] = getCoordinatesForPercent(startPercent)
    const [endX, endY] = getCoordinatesForPercent(endPercent)

    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0
    const colors = ['#9333ea', '#f59e0b', '#10b981', '#3b82f6', '#6b7280']
    const color = colors[i % colors.length]

    const r = 50
    const cx = 60
    const cy = 60
    
    const sX = cx + startX * r
    const sY = cy + startY * r
    const eX = cx + endX * r
    const eY = cy + endY * r
    
    const pathData = total === d.count
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${sX} ${sY} A ${r} ${r} 0 ${largeArcFlag} 1 ${eX} ${eY} Z`

    return {
      pathData,
      color,
      label: CAT_LABELS[d.category] || d.category,
      count: d.count,
      percent: Math.round((d.count / (total || 1)) * 100)
    }
  })

  return (
    <div className="flex items-center gap-6 w-full max-w-[320px]">
      <svg viewBox="0 0 120 120" className="w-24 h-24 flex-shrink-0">
        <g transform="rotate(-90 60 60)">
          {slices.map((s, i) => (
            <path
              key={i}
              d={s.pathData}
              fill={s.color}
              className="hover:opacity-90 transition-opacity cursor-pointer"
            >
              <title>{`${s.label}: ${s.count} (${s.percent}%)`}</title>
            </path>
          ))}
        </g>
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs truncate">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-500 dark:text-gray-400 font-medium truncate">{s.label}:</span>
            <span className="text-gray-800 dark:text-gray-200 font-semibold flex-shrink-0">{s.count} ({s.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  let cumulativePercent = 0
  
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent)
    const y = Math.sin(2 * Math.PI * percent)
    return [x, y]
  }

  const donutSlices = data.map((d, i) => {
    const startPercent = cumulativePercent
    cumulativePercent += d.count / (total || 1)
    const endPercent = cumulativePercent

    const [startX, startY] = getCoordinatesForPercent(startPercent)
    const [endX, endY] = getCoordinatesForPercent(endPercent)

    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0
    const colors: Record<string, string> = {
      'Indexed': '#10b981',
      'Processing': '#f59e0b',
      'Failed': '#ef4444'
    }
    const color = colors[d.status] || '#6b7280'

    const r = 50
    const cx = 60
    const cy = 60
    
    const sX = cx + startX * r
    const sY = cy + startY * r
    const eX = cx + endX * r
    const eY = cy + endY * r
    
    const pathData = total === d.count
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${sX} ${sY} A ${r} ${r} 0 ${largeArcFlag} 1 ${eX} ${eY} Z`

    return {
      pathData,
      color,
      label: d.status,
      count: d.count,
      percent: Math.round((d.count / (total || 1)) * 100)
    }
  })

  return (
    <div className="flex items-center gap-6 w-full max-w-[320px]">
      <svg viewBox="0 0 120 120" className="w-24 h-24 flex-shrink-0">
        <g transform="rotate(-90 60 60)">
          {donutSlices.map((s, i) => (
            <path
              key={i}
              d={s.pathData}
              fill={s.color}
              className="hover:opacity-90 transition-opacity cursor-pointer"
            >
              <title>{`${s.label}: ${s.count} (${s.percent}%)`}</title>
            </path>
          ))}
          {/* Inner cutout */}
          <circle cx="60" cy="60" r="28" className="fill-white dark:fill-gray-800" />
        </g>
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {donutSlices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs truncate">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-500 dark:text-gray-400 font-medium truncate">{s.label}:</span>
            <span className="text-gray-800 dark:text-gray-200 font-semibold flex-shrink-0">{s.count} ({s.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard Component ─────────────────────────────────────────────────────

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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Documents Uploaded Over Time */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Documents Uploaded Over Time
          </h3>
          <div className="flex items-center justify-center min-h-[160px]">
            {loadingStats && !stats ? (
              <Loader className="animate-spin text-purple-600" size={18} />
            ) : !stats?.charts?.documents_over_time?.length ? (
              <div className="text-xs text-gray-400 italic">No upload history available</div>
            ) : (
              <LineChart data={stats.charts.documents_over_time} />
            )}
          </div>
        </div>

        {/* Chart 2: Queries Per Day */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Queries Per Day
          </h3>
          <div className="flex items-center justify-center min-h-[160px]">
            {loadingStats && !stats ? (
              <Loader className="animate-spin text-purple-600" size={18} />
            ) : !stats?.charts?.queries_per_day?.length ? (
              <div className="text-xs text-gray-400 italic">No query history available</div>
            ) : (
              <BarChart data={stats.charts.queries_per_day} />
            )}
          </div>
        </div>

        {/* Chart 3: Document Categories */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Document Categories
          </h3>
          <div className="flex items-center justify-center min-h-[140px]">
            {loadingStats && !stats ? (
              <Loader className="animate-spin text-purple-600" size={18} />
            ) : !stats?.charts?.document_categories?.length ? (
              <div className="text-xs text-gray-400 italic">No category data available</div>
            ) : (
              <PieChart data={stats.charts.document_categories} />
            )}
          </div>
        </div>

        {/* Chart 4: Processing Status */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Processing Status
          </h3>
          <div className="flex items-center justify-center min-h-[140px]">
            {loadingStats && !stats ? (
              <Loader className="animate-spin text-purple-600" size={18} />
            ) : !stats?.charts?.processing_status?.length ? (
              <div className="text-xs text-gray-400 italic">No status data available</div>
            ) : (
              <DonutChart data={stats.charts.processing_status} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
