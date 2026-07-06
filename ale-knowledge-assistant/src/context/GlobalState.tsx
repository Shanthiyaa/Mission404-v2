import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  listDocuments,
  deleteDocument,
  uploadDocument,
  getUploadStatus,
  queryDocuments,
  authLogin,
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
  id: number
  title: string
  messages: Message[]
}

interface GlobalStateContextType {
  token: string | null
  user: AuthUser | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, department: string, password: string) => Promise<void>
  logout: () => void

  conversations: ConversationEntry[]
  activeId: number
  activeQueries: Record<number, boolean>
  files: UploadFile[]
  documents: Document[]
  docsLoading: boolean
  docsError: string | null
  selectedDocs: string[]
  multiDoc: boolean
  showCitations: boolean
  
  scrollPositions: Record<number, number>
  saveScrollPosition: (id: number, top: number) => void

  newConversation: () => void
  deleteConv: (convId: number) => Promise<void>
  setActiveId: (id: number) => void
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

const INITIAL: Message[] = [
  {
    role: 'assistant',
    content: "Hello! I'm your Ale Docbot. Ask me anything about your uploaded user guides, release notes, SQA test cases, and KCS articles.",
  },
]

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  // --- Auth State ---
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // --- Scroll State (to preserve position during background gen & navigation) ---
  const [scrollPositions, setScrollPositions] = useState<Record<number, number>>({})

  // --- Chat & Conversations ---
  const [conversations, setConversations] = useState<ConversationEntry[]>([
    { id: 1, title: 'New conversation', messages: INITIAL }
  ])
  const [activeId, setActiveId] = useState<number>(1)
  const [activeQueries, setActiveQueries] = useState<Record<number, boolean>>({})
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  // --- Uploads queue ---
  const [files, setFiles] = useState<UploadFile[]>([])

  // --- Documents caching ---
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)

  // --- Search Preferences ---
  const [multiDoc, setMultiDocState] = useState<boolean>(() => {
    const saved = localStorage.getItem('ale_pref_multidoc')
    return saved !== null ? saved === 'true' : true
  })
  const [showCitations, setShowCitationsState] = useState<boolean>(() => {
    const saved = localStorage.getItem('ale_pref_citations')
    return saved !== null ? saved === 'true' : true
  })

  const setMultiDoc = (val: boolean) => {
    setMultiDocState(val)
    localStorage.setItem('ale_pref_multidoc', String(val))
  }

  const setShowCitations = (val: boolean) => {
    setShowCitationsState(val)
    localStorage.setItem('ale_pref_citations', String(val))
  }

  const saveScrollPosition = useCallback((id: number, top: number) => {
    setScrollPositions(prev => ({ ...prev, [id]: top }))
  }, [])

  // --- Auth Handlers ---
  const login = async (email: string, password: string) => {
    const res = await authLogin(email, password)
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
    setConversations([{ id: 1, title: 'New conversation', messages: INITIAL }])
    setActiveId(1)
    setDocuments([])
    setScrollPositions({})
  }

  // --- Re-load user data on login or session load ---
  const loadUserData = useCallback(async () => {
    try {
      const convs = await getConversations()
      setConversations(convs.length > 0 ? convs : [{ id: 1, title: 'New conversation', messages: INITIAL }])
      if (convs.length > 0) {
        setActiveId(convs[0].id)
      } else {
        setActiveId(1)
      }
    } catch {
      setConversations([{ id: 1, title: 'New conversation', messages: INITIAL }])
      setActiveId(1)
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
        } catch {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
        }
      }
      setAuthLoading(false)
    }
    initUser()
  }, [token, loadUserData])

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
      }
    }, 1500)

    return () => clearInterval(id)
  }, [files, token, refreshDocuments])

  // --- Handlers ---
  const newConversation = () => {
    const id = Date.now()
    setConversations(prev => [{ id, title: 'New conversation', messages: INITIAL }, ...prev])
    setActiveId(id)
  }

  const deleteConv = async (convId: number) => {
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeId === convId) {
      const remaining = conversations.filter(c => c.id !== convId)
      if (remaining.length > 0) {
        setActiveId(remaining[0].id)
      } else {
        const fallbackId = Date.now()
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
    const newEntries: UploadFile[] = Array.from(selectedFiles).map(file => {
      const name = file.name.toLowerCase()
      const isValid = name.endsWith(expectedExt)
      return {
        file,
        taskId: null,
        stage: isValid ? 'Uploading…' : 'Validation failed',
        progress: 0,
        status: isValid ? ('uploading' as const) : ('error' as const),
        error: isValid ? null : `Selected file type is ${fileType.split(' ')[0]}. Please upload only ${expectedExt} files.`,
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

  const updateMessages = (id: number, updater: (msgs: Message[]) => Message[]) => {
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
    } catch (e: any) {
      updateMessages(currentActiveId, msgs => [
        ...msgs,
        {
          role: 'assistant',
          content: e.message?.includes('No documents')
            ? 'No documents have been indexed yet. Please upload a PDF first.'
            : e.message?.includes('LLM unavailable')
            ? 'The Ollama LLM is not reachable. Make sure Ollama is running: `ollama serve`'
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
        refreshDocuments
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
