/**
 * client.ts — Centralized API fetch wrapper
 * All backend calls go through here. Base URL is proxied by Vite in dev.
 */

const BASE = '/api'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = await res.json()
      detail = err.detail || err.message || detail
    } catch {}
    throw new ApiError(res.status, detail)
  }

  return res.json() as Promise<T>
}

// ── Upload ─────────────────────────────────────────────────────────────────

export interface UploadResponse {
  task_id: string
  doc_id: string
  filename: string
  status: string
  message: string
}

export async function uploadDocument(
  file: File,
  category: string
): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('category', category)

  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const e = await res.json(); detail = e.detail || detail } catch {}
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export interface TaskStatus {
  task_id: string
  filename: string
  stage: string
  progress: number
  done: boolean
  error: string | null
  chunks: number
}

export async function getUploadStatus(taskId: string): Promise<TaskStatus> {
  return request<TaskStatus>(`/upload/status/${taskId}`)
}

// ── Query ──────────────────────────────────────────────────────────────────

export interface Citation {
  source_file: string
  page: number
  section: string
  score: number
  text: string
  confidence: number
  is_table: boolean
  citation_label: string
}

export interface QueryResponse {
  answer: string
  citations: Citation[]
  confidence: number
  session_id: string | null
}

export async function queryDocuments(
  question: string,
  sessionId?: string,
  topK?: number
): Promise<QueryResponse> {
  return request<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify({ question, session_id: sessionId, top_k: topK }),
  })
}

// ── Documents ──────────────────────────────────────────────────────────────

export interface Document {
  id: string
  name: string
  category: string
  size: string
  pages: number
  status: 'Indexed' | 'Processing' | 'Failed' | 'Unknown'
  uploaded_at: string
  date: string
  chunks: number
  task_id: string
}

export async function listDocuments(): Promise<Document[]> {
  return request<Document[]>('/documents')
}

export async function deleteDocument(docId: string): Promise<{ success: boolean; deleted: string }> {
  return request(`/documents/${docId}`, { method: 'DELETE' })
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface Stats {
  total_documents: number
  indexed_documents: number
  total_queries: number
  avg_confidence: number
  active_users: number
  faiss_ready: boolean
}

export async function getStats(): Promise<Stats> {
  return request<Stats>('/stats')
}

// ── Activity ───────────────────────────────────────────────────────────────

export interface ActivityItem {
  text: string
  time: string
  color: string
}

export async function getActivity(): Promise<ActivityItem[]> {
  return request<ActivityItem[]>('/activity')
}

// ── Health ─────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; faiss_ready: boolean }> {
  return request('/health')
}
