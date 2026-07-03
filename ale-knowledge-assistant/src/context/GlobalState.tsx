import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  listDocuments,
  deleteDocument,
  uploadDocument,
  getUploadStatus,
  queryDocuments
} from '../api/client'
import type { Document } from '../api/client'
import type { UploadFile, Message } from '../types'

export interface ConversationEntry {
  id: number
  title: string
  messages: Message[]
}

interface GlobalStateContextType {
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
  
  newConversation: () => void
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
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined)

const INITIAL: Message[] = [
  {
    role: 'assistant',
    content: "Hello! I'm your Ale Docbot. Ask me anything about your uploaded user guides, release notes, SQA test cases, and KCS articles.",
  },
]

const CHAT_STORAGE_KEY = 'ale_chat_state'

function loadPersistedChat(): { conversations: ConversationEntry[]; activeId: number } {
  const fallback = {
    conversations: [{ id: 1, title: 'New conversation', messages: INITIAL }],
    activeId: 1,
  }
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!saved) return fallback
    const parsed = JSON.parse(saved)
    if (!parsed?.conversations?.length) return fallback
    return parsed
  } catch {
    return fallback
  }
}

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  // --- Chat & Conversations ---
  const [conversations, setConversations] = useState<ConversationEntry[]>(
    () => loadPersistedChat().conversations
  )
  const [activeId, setActiveId] = useState<number>(
    () => loadPersistedChat().activeId
  )
  const [activeQueries, setActiveQueries] = useState<Record<number, boolean>>({})
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  // --- Uploads queue ---
  const [files, setFiles] = useState<UploadFile[]>([])

  // --- Documents caching ---
  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
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

  // --- Persist Chat State ---
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ conversations, activeId }))
    } catch (err) {
      console.error('Failed to persist chat state', err)
    }
  }, [conversations, activeId])

  // --- Load Indexed Documents Cache ---
  const refreshDocuments = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    refreshDocuments().catch(err => console.error(err))
  }, [refreshDocuments])

  // --- Polling upload status globally ---
  useEffect(() => {
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

      // Refresh documents when any file transitions to 'done' (successfully indexed)
      if (anyStatusChanged) {
        refreshDocuments().catch(err => console.error(err))
      }
    }, 1500)

    return () => clearInterval(id)
  }, [files, refreshDocuments])

  // --- Handlers ---
  const newConversation = () => {
    const id = Date.now()
    setConversations(prev => [...prev, { id, title: 'New conversation', messages: INITIAL }])
    setActiveId(id)
  }

  const deleteDoc = async (docId: string) => {
    const target = documents.find(d => d.id === docId)
    if (!target) return
    
    // Optimistic delete: immediately remove from global cache to make UI instant
    setDocuments(prev => prev.filter(d => d.id !== docId))
    setSelectedDocs(prev => prev.filter(name => name !== target.name))

    try {
      await deleteDocument(docId)
    } catch (e) {
      // Revert cache if failed
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

    // Store in global queue so Upload page displays it immediately
    setFiles(prev => [...prev, ...newEntries])

    // Upload each valid file sequentially
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

    // Update conversation title if default
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
          citations: res.citations,
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
        
        newConversation,
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
