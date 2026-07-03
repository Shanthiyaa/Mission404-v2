import { useState, useRef } from 'react'
import { CloudUpload, FileText, Check, Loader, Clock, AlertCircle, X, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useGlobalState } from '../context/GlobalState'
import type { UploadFile } from '../types'

const CATEGORIES = ['User guide', 'Release notes', 'SQA test cases', 'KCS article']

const CATEGORY_API_MAP: Record<string, string> = {
  'User guide':     'user_guide',
  'Release notes':  'release_note',
  'SQA test cases': 'sqa',
  'KCS article':    'kcs',
}

const FILE_TYPES = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'TXT', 'ZIP (Multiple Documents)']
const FILE_TYPE_EXT_MAP: Record<string, string> = {
  'PDF': '.pdf',
  'DOCX': '.docx',
  'PPTX': '.pptx',
  'XLSX': '.xlsx',
  'TXT': '.txt',
  'ZIP (Multiple Documents)': '.zip'
}

export default function Upload() {
  const { files, startUpload, removeUploadFile } = useGlobalState()
  const [fileType, setFileType] = useState('PDF')
  const [cat, setCat]           = useState('User guide')
  const [dragging, setDragging] = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  // ── Handle file selection ─────────────────────────────────────────────────
  const handleFiles = async (selected: FileList | null) => {
    if (!selected) return
    const expectedExt = FILE_TYPE_EXT_MAP[fileType]
    const catApiValue = CATEGORY_API_MAP[cat] || 'unknown'
    await startUpload(selected, fileType, cat, expectedExt, catApiValue)
  }

  const removeFile = (index: number) => {
    removeUploadFile(index)
  }


  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white">Upload documents</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add PDFs or ZIP archives to your knowledge base for AI-powered search</p>
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
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Drop {fileType.split(' ')[0]} here</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">or click to browse · up to 200 MB per file</div>
            <div className="flex gap-2 justify-center flex-wrap">
              {['User guides', 'Release notes', 'SQA test cases', 'KCS articles'].map(t => (
                <span key={t} className="badge bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{t}</span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={FILE_TYPE_EXT_MAP[fileType]}
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          <div className="card mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Type</h3>
            <div className="relative">
              <select
                value={fileType}
                onChange={e => setFileType(e.target.value)}
                className="w-full border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-xs font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 focus:border-purple-500 focus:bg-purple-50 dark:focus:bg-purple-900/20 transition-colors cursor-pointer outline-none appearance-none pr-10"
              >
                {FILE_TYPES.map(t => (
                  <option key={t} value={t} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {t}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                <ChevronDown size={14} />
              </div>
            </div>
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


        </div>
      </div>
    </div>
  )
}
