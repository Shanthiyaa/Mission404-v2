/**
 * types/index.ts — Shared TypeScript interfaces
 * Single source of truth for all data shapes used across pages.
 */

export type DocStatus = 'Indexed' | 'Processing' | 'Failed' | 'Unknown'

export interface Document {
  id: string
  name: string
  category: string
  size: string
  pages: number
  status: DocStatus
  uploaded_at: string
  date: string
  chunks: number
  task_id: string
}

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

export interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  confidence?: number
  error?: boolean
}

export interface Stats {
  total_documents: number
  indexed_documents: number
  total_queries: number
  avg_confidence: number
  active_users: number
  faiss_ready: boolean
}

export interface ActivityItem {
  text: string
  time: string
  color: string
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

export interface UploadFile {
  file: File
  taskId: string | null
  stage: string
  progress: number
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error'
  error: string | null
  chunks: number
}
