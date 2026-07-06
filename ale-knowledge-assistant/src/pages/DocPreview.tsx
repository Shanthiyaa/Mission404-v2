import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react'

export default function DocPreview() {
  const [searchParams] = useSearchParams()
  const filename = searchParams.get('file')
  const anchor = searchParams.get('anchor')
  const page = searchParams.get('page') || '1'

  const isPdf = filename?.toLowerCase().endsWith('.pdf')

  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filename) {
      setError('No file specified.')
      setLoading(false)
      return
    }

    if (isPdf) {
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    const token = localStorage.getItem('ale_jwt_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    fetch(`/api/documents/${encodeURIComponent(filename)}/view-html`, { headers })
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
  }, [filename, isPdf])

  const searchText = searchParams.get('text')

  useEffect(() => {
    if (loading || isPdf) return
    if (!htmlContent) return

    const timer = setTimeout(() => {
      // 1. Excel sheet tab auto-activation
      if (anchor && anchor.startsWith('sheet-')) {
        const sheetId = anchor;
        const container = document.getElementById(sheetId);
        if (container) {
          document.querySelectorAll('.sheet-container').forEach(el => el.classList.remove('active'));
          document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
          
          container.classList.add('active');
          
          const sheetName = anchor.replace('sheet-', '');
          const tabBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
            btn => btn.textContent === sheetName
          );
          if (tabBtn) {
            tabBtn.classList.add('active');
          }
        }
      }

      // 2. Perform text highlighting
      let textHighlighted = false;
      const targetText = searchText ? decodeURIComponent(searchText).trim() : '';

      if (targetText) {
        // Find best search segments to search progressively:
        const searchSegments: string[] = [];
        if (targetText.length < 150) {
          searchSegments.push(targetText);
        }

        // Split into lines
        const lines = targetText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length >= 15);
        if (lines.length > 0) {
          const sortedLines = [...lines].sort((a, b) => b.length - a.length);
          searchSegments.push(...sortedLines);
        }

        // Split into sentences
        const sentences = targetText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length >= 15);
        if (sentences.length > 0) {
          const sortedSentences = [...sentences].sort((a, b) => b.length - a.length);
          searchSegments.push(...sortedSentences);
        }

        // Split into smaller fragments
        if (targetText.length >= 40) {
          searchSegments.push(targetText.slice(0, 40).trim());
        }

        const uniqueSegments = Array.from(new Set(searchSegments));

        const searchScope = (anchor && (anchor.startsWith('sheet-') || anchor.startsWith('slide-')) && document.getElementById(anchor))
          ? document.getElementById(anchor)
          : document.querySelector('.prose');

        if (searchScope) {
          for (const segment of uniqueSegments) {
            const walker = document.createTreeWalker(searchScope, NodeFilter.SHOW_TEXT, null);
            let currentNode = walker.nextNode();
            let matched = false;

            while (currentNode) {
              const nodeText = currentNode.nodeValue || '';
              const matchIndex = nodeText.toLowerCase().indexOf(segment.toLowerCase());
              if (matchIndex !== -1) {
                const range = document.createRange();
                range.setStart(currentNode, matchIndex);
                range.setEnd(currentNode, matchIndex + segment.length);

                const span = document.createElement('span');
                span.className = 'highlight-section inline-block bg-purple-100 dark:bg-purple-900/50 border-l-4 border-purple-600 px-1.5 py-0.5 rounded';
                span.style.scrollMargin = '100px';

                range.surroundContents(span);
                span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textHighlighted = true;
                matched = true;
                break;
              }
              currentNode = walker.nextNode();
            }

            if (matched) {
              break;
            }
          }
        }
      }

      // 3. Fallback standard element highlight/scroll
      if (!textHighlighted && anchor) {
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('highlight-section');
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [loading, anchor, htmlContent, searchText, isPdf])

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

      <main className={`flex-1 bg-white ${isPdf ? 'p-0 overflow-hidden' : 'p-6 overflow-auto'}`}>
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

        {!loading && !error && isPdf && (
          <iframe
            src={`/api/documents/${encodeURIComponent(filename || '')}/view?token=${encodeURIComponent(localStorage.getItem('ale_jwt_token') || '')}#page=${page}`}
            className="w-full h-full border-0"
            title={filename || 'PDF Preview'}
          />
        )}

        {!loading && !error && !isPdf && htmlContent && (
          <div className="relative">
            <style>{`
              .highlight-section {
                background-color: #f3e8ff !important;
                border-left: 4px solid #9333ea !important;
                padding: 4px 8px;
                border-radius: 0 4px 4px 0;
                animation: pulse-highlight 2s ease-in-out;
              }
              .dark .highlight-section {
                background-color: rgba(147, 51, 234, 0.2) !important;
                border-left-color: #a855f7 !important;
                color: #f3f4f6 !important;
              }
              @keyframes pulse-highlight {
                0% { background-color: #f3e8ff; }
                50% { background-color: #e9d5ff; }
                100% { background-color: #f3e8ff; }
              }
            `}</style>
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          </div>
        )}
      </main>
    </div>
  )
}
