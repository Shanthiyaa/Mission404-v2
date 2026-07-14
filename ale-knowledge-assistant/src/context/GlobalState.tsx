import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  listDocuments,
  deleteDocument,
  uploadDocument,
  getUploadStatus,
  queryDocuments,
  authLogin,
  authLoginRegular,
  authSignup,
  getProfile,
  getConversations,
  deleteConversation,
  TOKEN_KEY,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  NotificationItem,
  AuthUser
} from '../api/client'
import type { Document, Citation } from '../api/client'
import type { UploadFile, Message } from '../types'

export interface ConversationEntry {
  id: number | string
  title: string
  messages: Message[]
}

interface GlobalStateContextType {
  token: string | null
  user: AuthUser | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginRegular: (name: string, email: string, role: string) => Promise<void>
  signup: (name: string, email: string, department: string, password: string) => Promise<void>
  logout: () => void

  conversations: ConversationEntry[]
  activeId: number | string
  activeQueries: Record<string | number, boolean>
  files: UploadFile[]
  documents: Document[]
  docsLoading: boolean
  docsError: string | null
  selectedDocs: string[]
  multiDoc: boolean
  showCitations: boolean
  
  scrollPositions: Record<string | number, number>
  saveScrollPosition: (id: string | number, top: number) => void

  newConversation: () => void
  deleteConv: (convId: string | number) => Promise<void>
  setActiveId: (id: string | number) => void
  setConversations: React.Dispatch<React.SetStateAction<ConversationEntry[]>>
  setSelectedDocs: React.Dispatch<React.SetStateAction<string[]>>
  setMultiDoc: (val: boolean) => void
  setShowCitations: (val: boolean) => void
  
  startUpload: (selectedFiles: FileList, fileType: string, category: string, expectedExt: string, catApiValue: string) => Promise<void>
  removeUploadFile: (index: number) => void
  sendChatQuery: (text: string, sessionId: string) => Promise<void>
  deleteDoc: (docId: string) => Promise<void>
  refreshDocuments: () => Promise<void>

  notifications: NotificationItem[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markNotifAsRead: (id: number) => Promise<void>
  markAllNotifsAsRead: () => Promise<void>
  deleteNotif: (id: number) => Promise<void>
  deleteAllNotifs: () => Promise<void>
  updateUser: (updatedUser: AuthUser, newToken?: string) => void
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined)

// FIX: conversation ids must be globally unique across users/sessions.
// A hardcoded default id (e.g. `1`) collides across different browser
// sessions/users, and the backend's Conversation.id is a global primary key —
// two users both starting from id "1" causes a primary-key collision on the
// very first query, which the backend surfaces as an unhandled HTTP 500.
function makeConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const INITIAL: Message[] = [
  {
    role: 'assistant',
    content: "Hello! I'm your AL Docbot. Ask me anything about your uploaded user guides, release notes, SQA test cases, and KCS articles.",
  },
]

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  // --- Auth State ---
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // --- Scroll State (to preserve position during background gen & navigation) ---
  const [scrollPositions, setScrollPositions] = useState<Record<string | number, number>>({})

  // --- Chat & Conversations ---
  // FIX: use a unique id instead of the hardcoded `1` (see makeConversationId above)
  const [defaultConvId] = useState<string>(() => makeConversationId())
  const [conversations, setConversations] = useState<ConversationEntry[]>(() => [
    { id: defaultConvId, title: 'New conversation', messages: INITIAL }
  ])
  const [activeId, setActiveId] = useState<string | number>(() => defaultConvId)
  const [activeQueries, setActiveQueries] = useState<Record<string | number, boolean>>({})
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  // --- Uploads queue ---
  const [files, setFiles] = useState<UploadFile[]>([])

  // --- Documents caching ---
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)

  // --- Notifications State ---
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)

  // --- Search Preferences ---
  const [multiDoc, setMultiDocState] = useState<boolean>(true)
  const [showCitations, setShowCitationsState] = useState<boolean>(true)

  // Load preferences dynamically when user changes (login/logout/switch)
  useEffect(() => {
    if (user) {
      const savedMultiDoc = localStorage.getItem(`ale_pref_${user.email}_multidoc`)
      setMultiDocState(savedMultiDoc !== null ? savedMultiDoc === 'true' : true)

      const savedCitations = localStorage.getItem(`ale_pref_${user.email}_citations`)
      setShowCitationsState(savedCitations !== null ? savedCitations === 'true' : true)
    } else {
      const savedMultiDoc = localStorage.getItem('ale_pref_multidoc')
      setMultiDocState(savedMultiDoc !== null ? savedMultiDoc === 'true' : true)

      const savedCitations = localStorage.getItem('ale_pref_citations')
      setShowCitationsState(savedCitations !== null ? savedCitations === 'true' : true)
    }
  }, [user])

  const setMultiDoc = (val: boolean) => {
    setMultiDocState(val)
    if (user) {
      localStorage.setItem(`ale_pref_${user.email}_multidoc`, String(val))
    } else {
      localStorage.setItem('ale_pref_multidoc', String(val))
    }
  }

  const setShowCitations = (val: boolean) => {
    setShowCitationsState(val)
    if (user) {
      localStorage.setItem(`ale_pref_${user.email}_citations`, String(val))
    } else {
      localStorage.setItem('ale_pref_citations', String(val))
    }
  }

  const saveScrollPosition = useCallback((id: string | number, top: number) => {
    setScrollPositions(prev => ({ ...prev, [id]: top }))
  }, [])

  // --- Auth Handlers ---
  const login = async (email: string, password: string) => {
    const res = await authLogin(email, password)
    localStorage.setItem(TOKEN_KEY, res.access_token)
    setToken(res.access_token)
    setUser(res.user)
  }

  const loginRegular = async (name: string, email: string, role: string) => {
    const res = await authLoginRegular(name, email, role)
    localStorage.setItem(TOKEN_KEY, res.access_token)
    setToken(res.access_token)
    setUser(res.user)
  }

  const signup = async (name: string, email: string, department: string, password: string) => {
    await authSignup(name, email, department, password)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    const freshId = makeConversationId()
    setConversations([{ id: freshId, title: 'New conversation', messages: INITIAL }])
    setActiveId(freshId)
    setDocuments([])
    setScrollPositions({})
    setNotifications([])
    setUnreadCount(0)
  }

  // --- User Profile Update ---
  const updateUser = (updatedUser: AuthUser, newToken?: string) => {
    setUser(updatedUser)
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
      setToken(newToken)
    }
  }

  // --- Notification Handlers ---
  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const items = await getNotifications()
      setNotifications(items)
      const countRes = await getUnreadCount()
      setUnreadCount(countRes.count)
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  }, [token])

  const markNotifAsRead = async (id: number) => {
    try {
      await markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error('Failed to mark notification as read:', e)
    }
  }

  const markAllNotifsAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e)
    }
  }

  const deleteNotif = async (id: number) => {
    try {
      await deleteNotification(id)
      const target = notifications.find(n => n.id === id)
      if (target && !target.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (e) {
      console.error('Failed to delete notification:', e)
    }
  }

  const deleteAllNotifs = async () => {
    try {
      await deleteAllNotifications()
      setNotifications([])
      setUnreadCount(0)
    } catch (e) {
      console.error('Failed to delete all notifications:', e)
    }
  }

  // --- Re-load user data on login or session load ---
  const loadUserData = useCallback(async () => {
    try {
      const convs = await getConversations()
      if (convs.length > 0) {
        setConversations(convs)
        setActiveId(convs[0].id)
      } else {
        const freshId = makeConversationId()
        setConversations([{ id: freshId, title: 'New conversation', messages: INITIAL }])
        setActiveId(freshId)
      }
    } catch {
      const freshId = makeConversationId()
      setConversations([{ id: freshId, title: 'New conversation', messages: INITIAL }])
      setActiveId(freshId)
    }

    try {
      setDocsLoading(true)
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (e: any) {
      setDocsError(e.message || 'Failed to load documents')
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    async function initUser() {
      if (token) {
        try {
          const profile = await getProfile()
          setUser(profile)
          await loadUserData()
          await fetchNotifications()
        } catch {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
        }
      }
      setAuthLoading(false)
    }
    initUser()
  }, [token, loadUserData, fetchNotifications])

  // --- Periodic Heartbeat for Active User Tracking ---
  useEffect(() => {
    if (!token) return

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      } catch (e) {
        console.error('Heartbeat failed:', e)
      }
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 30000)

    let lastActivityTime = Date.now()
    const handleUserActivity = () => {
      const now = Date.now()
      if (now - lastActivityTime > 30000) {
        lastActivityTime = now
        sendHeartbeat()
      }
    }

    window.addEventListener('mousemove', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)
    window.addEventListener('click', handleUserActivity)
    window.addEventListener('scroll', handleUserActivity)

    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('scroll', handleUserActivity)
    }
  }, [token])

  // --- Load Indexed Documents Cache ---
  const refreshDocuments = useCallback(async () => {
    if (!token) return
    setDocsLoading(true)
    setDocsError(null)
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (e: any) {
      setDocsError(e.message || 'Failed to load documents')
    } finally {
      setDocsLoading(false)
    }
  }, [token])

  // --- Polling upload status globally ---
  useEffect(() => {
    if (!token) return
    const processing = files.filter(f => f.status === 'processing' && f.taskId)
    if (!processing.length) return

    const id = setInterval(async () => {
      let anyStatusChanged = false
      const updatedFiles = await Promise.all(
        files.map(async f => {
          if (f.status !== 'processing' || !f.taskId) return f
          try {
            const status = await getUploadStatus(f.taskId)
            if (status.done) {
              anyStatusChanged = true
            }
            return {
              ...f,
              stage: status.stage,
              progress: status.progress,
              chunks: status.chunks,
              status: status.done
                ? (status.error ? ('error' as const) : ('done' as const))
                : ('processing' as const),
              error: status.error,
            }
          } catch {
            return f
          }
        })
      )

      setFiles(updatedFiles)

      if (anyStatusChanged) {
        refreshDocuments().catch(err => console.error(err))
        fetchNotifications().catch(err => console.error(err))
      }
    }, 1500)

    return () => clearInterval(id)
  }, [files, token, refreshDocuments, fetchNotifications])

  // --- Handlers ---
  const newConversation = () => {
    // FIX: use a globally-unique id (this becomes the backend session_id too —
    // see sendChatQuery / Chat.tsx) instead of Date.now(), which is not
    // guaranteed unique across simultaneous users.
    const id = makeConversationId()
    setConversations(prev => [{ id, title: 'New conversation', messages: INITIAL }, ...prev])
    setActiveId(id)
  }

  const deleteConv = async (convId: number | string) => {
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeId === convId) {
      const remaining = conversations.filter(c => c.id !== convId)
      if (remaining.length > 0) {
        setActiveId(remaining[0].id)
      } else {
        const fallbackId = makeConversationId()
        setConversations([{ id: fallbackId, title: 'New conversation', messages: INITIAL }])
        setActiveId(fallbackId)
      }
    }
    
    try {
      await deleteConversation(String(convId))
    } catch (e) {
      console.error('Failed to delete conversation on server:', e)
    }
  }

  const deleteDoc = async (docId: string) => {
    const target = documents.find(d => d.id === docId)
    if (!target) return
    
    setDocuments(prev => prev.filter(d => d.id !== docId))
    setSelectedDocs(prev => prev.filter(name => name !== target.name))

    try {
      await deleteDocument(docId)
    } catch (e) {
      refreshDocuments().catch(err => console.error(err))
      throw e;
    }
  };

  const removeUploadFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const startUpload = async (
    selectedFiles: FileList,
    fileType: string,
    category: string,
    expectedExt: string,
    catApiValue: string
  ) => {
    const isNormalUser = user?.role !== 'Admin'
    let currentStorage = documents.reduce((sum, doc) => sum + (doc.size_bytes || 0), 0)
    const limitBytes = 512 * 1024 * 1024

    const newEntries: UploadFile[] = Array.from(selectedFiles).map(file => {
      const name = file.name.toLowerCase()
      const isValid = name.endsWith(expectedExt)
      
      let sizeError = null
      if (isValid && isNormalUser) {
        if (currentStorage + file.size > limitBytes) {
          sizeError = "You have reached your 512 MB storage limit. Please delete documents or free up space to upload new files."
        } else {
          currentStorage += file.size
        }
      }

      return {
        file,
        taskId: null,
        stage: (!isValid) ? 'Validation failed' : (sizeError ? 'Limit exceeded' : 'Uploading…'),
        progress: 0,
        status: (isValid && !sizeError) ? ('uploading' as const) : ('error' as const),
        error: !isValid
          ? `Selected file type is ${fileType.split(' ')[0]}. Please upload only ${expectedExt} files.`
          : sizeError,
        chunks: 0,
      }
    })

    setFiles(prev => [...prev, ...newEntries])

    for (const entry of newEntries) {
      if (entry.status === 'error') continue
      try {
        const res = await uploadDocument(entry.file, catApiValue)
        setFiles(prev =>
          prev.map(f =>
            f.file === entry.file
              ? { ...f, taskId: res.task_id, stage: 'Queued…', progress: 5, status: 'processing' as const }
              : f
          )
        )
      } catch (e: any) {
        setFiles(prev =>
          prev.map(f =>
            f.file === entry.file
              ? { ...f, status: 'error' as const, error: e.message, stage: 'Upload failed' }
              : f
          )
        )
      }
    }
  }

  const updateMessages = (id: number | string, updater: (msgs: Message[]) => Message[]) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, messages: updater(c.messages) } : c))
    )
  }

  const sendChatQuery = async (text: string, sessionId: string) => {
    const currentActiveId = activeId
    const q = text.trim()
    if (!q) return

    updateMessages(currentActiveId, msgs => [...msgs, { role: 'user', content: q }])
    setActiveQueries(prev => ({ ...prev, [currentActiveId]: true }))

    setConversations(prev =>
      prev.map(c =>
        c.id === currentActiveId && c.title === 'New conversation'
          ? { ...c, title: q.length > 40 ? q.slice(0, 40) + '…' : q }
          : c
      )
    )

    try {
      const res = await queryDocuments(q, sessionId, undefined, selectedDocs)
      updateMessages(currentActiveId, msgs => [
        ...msgs,
        {
          role: 'assistant',
          content: res.answer,
          citations: res.citations as Citation[],
          confidence: res.confidence,
        },
      ])
      await fetchNotifications()
    } catch (e: any) {
      updateMessages(currentActiveId, msgs => [
        ...msgs,
        {
          role: 'assistant',
          content: e.message?.includes('No documents')
            ? 'No documents have been indexed yet. Please upload a PDF first.'
            : e.message?.includes('LLM unavailable')
            ? 'The Ollama LLM is not reachable. Make sure Ollama is running: `ollama serve`'
            : e.message?.includes('maximum limit')
            ? e.message
            : 'Something went wrong: ' + e.message,
          error: true,
        },
      ])
    } finally {
      setActiveQueries(prev => ({ ...prev, [currentActiveId]: false }))
    }
  }

  return (
    <GlobalStateContext.Provider
      value={{
        token,
        user,
        authLoading,
        login,
        loginRegular,
        signup,
        logout,

        conversations,
        activeId,
        activeQueries,
        files,
        documents,
        docsLoading,
        docsError,
        selectedDocs,
        multiDoc,
        showCitations,
        
        scrollPositions,
        saveScrollPosition,

        newConversation,
        deleteConv,
        setActiveId,
        setConversations,
        setSelectedDocs,
        setMultiDoc,
        setShowCitations,
        
        startUpload,
        removeUploadFile,
        sendChatQuery,
        deleteDoc,
        refreshDocuments,

        notifications,
        unreadCount,
        fetchNotifications,
        markNotifAsRead,
        markAllNotifsAsRead,
        deleteNotif,
        deleteAllNotifs,
        updateUser
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  )
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext)
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider')
  }
  return context
}
