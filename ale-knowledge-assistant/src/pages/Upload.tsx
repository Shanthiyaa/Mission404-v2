import { useState, useRef, useEffect } from 'react'
import { CloudUpload, FileText, Check, Loader, Clock, AlertCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { uploadDocument, getUploadStatus } from '../api/client'
import type { UploadFile } from '../types'

const CATEGORIES = ['User guide', 'Release notes', 'SQA test cases', 'KCS article']

const CATEGORY_API_MAP: Record<string, string> = {
  'User guide':     'user_guide',
  'Release notes':  'release_note',
  'SQA test cases': 'sqa',
  'KCS article':    'kcs',
}

export default function Upload() {
  const [cat, setCat]           = useState('User guide')
  const [dragging, setDragging] = useState(false)
  const [files, setFiles]       = useState<UploadFile[]>([])
  const inputRef                = useRef<HTMLInputElement>(null)

  // ── Poll status for in-progress uploads ──────────────────────────────────
  useEffect(() => {
    const processing = files.filter(f => f.status === 'processing' && f.taskId)
    if (!processing.length) return

    const id = setInterval(async () => {
      for (const uf of processing) {
        if (!uf.taskId) continue
        try {
          const status = await getUploadStatus(uf.taskId)
          setFiles(prev => prev.map(f =>
            f.taskId === uf.taskId
              ? {
                  ...f,
                  stage:    status.stage,
                  progress: status.progress,
                  chunks:   status.chunks,
                  status:   status.done
                    ? (status.error ? 'error' : 'done')
                    : 'processing',
                  error: status.error,
                }
              : f
          ))
        } catch {}
      }
    }, 1500)

    return () => clearInterval(id)
  }, [files])

  // ── Handle file selection ─────────────────────────────────────────────────
  const handleFiles = async (selected: FileList | null) => {
    if (!selected) return
    const pdfs = Array.from(selected).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) return

    const newEntries: UploadFile[] = pdfs.map(file => ({
      file,
      taskId:   null,
      stage:    'Uploading…',
      progress: 0,
      status:   'uploading',
      error:    null,
      chunks:   0,
    }))

    setFiles(prev => [...prev, ...newEntries])

    // Upload each file
    for (const entry of newEntries) {
      try {
        const res = await uploadDocument(entry.file, CATEGORY_API_MAP[cat] || 'unknown')
        setFiles(prev => prev.map(f =>
          f.file === entry.file
            ? { ...f, taskId: res.task_id, stage: 'Queued…', progress: 5, status: 'processing' }
            : f
        ))
      } catch (e: any) {
        setFiles(prev => prev.map(f =>
          f.file === entry.file
            ? { ...f, status: 'error', error: e.message, stage: 'Upload failed' }
            : f
        ))
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ── Pipeline stages display ───────────────────────────────────────────────
  const activeFile = files.find(f => f.status === 'processing')

  const pipelineStages = [
    { label: 'Text extraction',      key: 'extract' },
    { label: 'Chunking',             key: 'chunk'   },
    { label: 'Generating embeddings', key: 'embed'  },
    { label: 'Indexing to FAISS',    key: 'faiss'   },
  ]

  const getStageState = (key: string, progress: number) => {
    const thresholds: Record<string, [number, number]> = {
      extract: [10, 40],
      chunk:   [40, 55],
      embed:   [55, 85],
      faiss:   [85, 100],
    }
    const [start, end] = thresholds[key] || [0, 0]
    if (progress >= end)   return 'done'
    if (progress >= start) return 'active'
    return 'pending'
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white">Upload documents</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add PDFs to your knowledge base for AI-powered search</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left column: drop zone + category ── */}
        <div>
          <div
            onDragOver={e  => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setDragging(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-4',
              dragging
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10'
            )}
          >
            <CloudUpload size={32} className="text-purple-500 mx-auto mb-3" />
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Drop PDFs here</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">or click to browse · up to 200 MB per file</div>
            <div className="flex gap-2 justify-center flex-wrap">
              {['User guides', 'Release notes', 'SQA test cases', 'KCS articles'].map(t => (
                <span key={t} className="badge bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{t}</span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Document category</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <div
                  key={c}
                  onClick={() => setCat(c)}
                  className={clsx(
                    'border rounded-lg p-3 cursor-pointer transition-colors',
                    cat === c
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                  )}
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-white">{c}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c === 'User guide'     && 'Product manuals'}
                    {c === 'Release notes'  && 'Version changelogs'}
                    {c === 'SQA test cases' && 'Test documentation'}
                    {c === 'KCS article'    && 'Knowledge articles'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: file list + pipeline ── */}
        <div>
          {files.length > 0 && (
            <div className="card mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Files</h3>
              <div className="space-y-3">
                {files.map((f, i) => (
                  <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <FileText size={16} className="text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{f.file.name}</div>
                        <div className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                      <span className={clsx('badge', {
                        'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300': f.status === 'processing' || f.status === 'uploading',
                        'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300': f.status === 'done',
                        'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300':         f.status === 'error',
                        'bg-gray-50 text-gray-500':                                             f.status === 'queued',
                      })}>
                        {f.status === 'done' ? 'Done' : f.status === 'error' ? 'Failed' : f.status === 'uploading' ? 'Uploading' : 'Processing'}
                      </span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-gray-300 hover:text-gray-500 ml-1"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {f.error && (
                      <div className="flex items-center gap-1.5 text-xs text-red-500 mb-1">
                        <AlertCircle size={11} />
                        {f.error}
                      </div>
                    )}

                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-1 rounded-full transition-all duration-500', {
                          'bg-green-500': f.status === 'done',
                          'bg-red-400':   f.status === 'error',
                          'bg-purple-500': f.status === 'processing' || f.status === 'uploading',
                        })}
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>

                    {f.status !== 'done' && f.status !== 'error' && (
                      <div className="text-xs text-gray-400 mt-1">{f.stage}</div>
                    )}
                    {f.status === 'done' && f.chunks > 0 && (
                      <div className="text-xs text-green-600 mt-1">{f.chunks} chunks indexed</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Processing pipeline</h3>
            <div className="space-y-2.5">
              {pipelineStages.map((stage, i) => {
                const progress = activeFile?.progress ?? 0
                const state    = activeFile ? getStageState(stage.key, progress) : 'pending'
                return (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    {state === 'done' ? (
                      <Check size={15} className="text-green-500 flex-shrink-0" />
                    ) : state === 'active' ? (
                      <Loader size={15} className="text-purple-500 flex-shrink-0 animate-spin" />
                    ) : (
                      <Clock size={15} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    )}
                    <span className={clsx('text-xs', {
                      'text-gray-700 dark:text-gray-300': state === 'done',
                      'text-purple-600':                  state === 'active',
                      'text-gray-300 dark:text-gray-600': state === 'pending',
                    })}>
                      {stage.label}
                      {state === 'active' && activeFile && (
                        <span className="ml-1 text-gray-400">({activeFile.stage})</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>

            {!activeFile && files.length === 0 && (
              <p className="text-xs text-gray-400 mt-3">Upload a PDF to see the pipeline in action.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
