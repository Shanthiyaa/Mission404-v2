/**
 * client.ts — Centralized API fetch wrapper
 * All backend calls go through here. Base URL is proxied by Vite in dev.
 */

const BASE = '/api'
export const TOKEN_KEY = 'ale_jwt_token'

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
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...options.headers },
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

  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}/upload`, { 
    method: 'POST', 
    headers,
    body: form 
  })

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
  topK?: number,
  docFiles?: string[]
): Promise<QueryResponse> {
  return request<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify({
      question,
      session_id: sessionId,
      top_k: topK,
      doc_files: docFiles && docFiles.length > 0 ? docFiles : undefined
    }),
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

export interface ChartsData {
  documents_over_time: { date: string; count: number }[]
  queries_per_day: { date: string; count: number }[]
  document_categories: { category: string; count: number }[]
  processing_status: { status: string; count: number }[]
}

export interface Stats {
  total_documents: number
  indexed_documents: number
  total_queries: number
  avg_confidence: number
  active_users: number
  faiss_ready: boolean
  charts?: ChartsData
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

// ── Auth Endpoints ─────────────────────────────────────────────────────────

export interface AuthUser {
  name: string
  display_name?: string
  email: string
  department: string
  profile_picture?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export async function authLogin(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function authSignup(name: string, email: string, department: string, password: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, department, password }),
  })
}

export async function getProfile(): Promise<AuthUser> {
  return request<AuthUser>('/auth/profile')
}

// ── Conversations Endpoints ──────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export interface ConversationEntry {
  id: number
  title: string
  messages: Message[]
}

export async function getConversations(): Promise<ConversationEntry[]> {
  return request<ConversationEntry[]>('/conversations')
}

export async function deleteConversation(convId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/conversations/${convId}`, { method: 'DELETE' })
}

export interface NotificationItem {
  id: number
  type: string
  text: string
  link?: string
  is_read: boolean
  time: string
  title?: string
  target_conv_id?: string
  target_msg_id?: number
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return request<NotificationItem[]>('/notifications')
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count')
}

export async function markAsRead(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' })
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/notifications/read-all', { method: 'POST' })
}

export async function deleteNotification(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' })
}

export async function deleteAllNotifications(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/notifications', { method: 'DELETE' })
}

export interface UpdateProfilePayload {
  username?: string
  display_name?: string
  email?: string
  profile_picture?: string
  current_password?: string
  new_password?: string
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; access_token: string; user: AuthUser }> {
  return request('/auth/profile/update', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
