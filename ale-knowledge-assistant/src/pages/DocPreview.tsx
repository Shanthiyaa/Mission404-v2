import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react'

export default function DocPreview() {
  const [searchParams] = useSearchParams()
  const filename = searchParams.get('file')
  const anchor = searchParams.get('anchor')

  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filename) {
      setError('No file specified.')
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/documents/${encodeURIComponent(filename)}/view-html`)
      .then(async res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to load document preview`)
        }
        return res.text()
      })
      .then(html => {
        setHtmlContent(html)
        setError(null)
      })
      .catch(err => {
        setError(err.message || 'Error loading preview')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [filename])

  useEffect(() => {
    if (loading || !anchor || !htmlContent) return
    // Wait a brief moment for the HTML content to render and the DOM to be ready
    const timer = setTimeout(() => {
      const element = document.getElementById(anchor)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        element.classList.add('highlight-section')
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [loading, anchor, htmlContent])

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden text-gray-900 dark:text-white">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => window.close()}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          title="Close tab"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[400px]">
            {filename}
          </h1>
          <p className="text-[10px] text-gray-400">Document Previewer</p>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-white p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader size={30} className="text-purple-600 animate-spin mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Generating preview...</p>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mt-10 p-4 border border-red-100 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-300 flex gap-2">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="font-semibold text-sm">Error Loading Preview</div>
              <div className="text-xs mt-1">{error}</div>
              <button 
                onClick={() => window.location.reload()}
                className="text-xs font-semibold underline mt-2 block"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && htmlContent && (
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        )}
      </main>
    </div>
  )
}
