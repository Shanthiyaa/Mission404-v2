import { useState } from 'react'
import { Search, Trash2, FileText, RefreshCw, AlertCircle, Loader } from 'lucide-react'
import clsx from 'clsx'
import { useDocuments } from '../hooks/useDocuments'

const FILTERS = ['All', 'User guide', 'Release notes', 'SQA', 'KCS']

const CAT_BADGE: Record<string, string> = {
  'user_guide':   'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'release_note': 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'sqa':          'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'kcs':          'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'unknown':      'bg-gray-50 dark:bg-gray-800 text-gray-500',
}

const CAT_LABEL: Record<string, string> = {
  'user_guide':   'User guide',
  'release_note': 'Release notes',
  'sqa':          'SQA',
  'kcs':          'KCS',
  'unknown':      'Unknown',
}

export default function KnowledgeBase() {
  const { documents, loading, error, refresh, remove } = useDocuments()
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = documents.filter(d => {
    const catLabel = CAT_LABEL[d.category] || d.category
    const matchFilter = filter === 'All' || catLabel.toLowerCase().includes(filter.toLowerCase())
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Remove "${name}" from the knowledge base?`)) return
    setDeleting(docId)
    try {
      await remove(docId)
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">Knowledge base</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All indexed documents available for AI search</p>
        </div>
        <button
          onClick={refresh}
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
          {error} — Make sure the API server is running on port 8000.
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 w-48">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search docs…"
              className="bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none w-full placeholder-gray-400"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'text-xs px-3 py-1 rounded-full border transition-colors',
                  filter === f
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {loading ? 'Loading…' : `${filtered.length} document${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && documents.length === 0 && (
          <div className="p-8 text-center">
            <Loader size={20} className="text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading documents…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center">
            <FileText size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {documents.length === 0
                ? 'No documents uploaded yet. Go to Upload docs to add PDFs.'
                : 'No documents match your search.'}
            </p>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Document', 'Category', 'Size', 'Pages', 'Status', 'Uploaded', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr
                  key={d.id}
                  className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-purple-500 flex-shrink-0" />
                      <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${CAT_BADGE[d.category] || CAT_BADGE['unknown']}`}>
                      {CAT_LABEL[d.category] || d.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{d.size}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{d.pages}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', {
                      'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300': d.status === 'Indexed',
                      'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300': d.status === 'Processing',
                      'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400':         d.status === 'Failed',
                      'bg-gray-50 text-gray-400':                                             d.status === 'Unknown',
                    })}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{d.date}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(d.id, d.name)}
                      disabled={deleting === d.id || d.status === 'Processing'}
                      className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {deleting === d.id
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
