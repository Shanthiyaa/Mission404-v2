import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Send, Plus, FileText, AlertCircle, ExternalLink, Filter, ArrowDown } from 'lucide-react'
import clsx from 'clsx'
import { useGlobalState } from '../context/GlobalState'
import type { Message } from '../types'


const INITIAL: Message[] = [
  {
    role: 'assistant',
    content: "Hello! I'm your AL Docbot. Ask me anything about your uploaded user guides, release notes, SQA test cases, and KCS articles.",
  },
]

const CHAT_STORAGE_KEY = 'ale_chat_state'

interface ConversationEntry {
  id: number
  title: string
  messages: Message[]
}

interface CitationCardProps {
  index: number
  cite: any
}
function CitationCard({ index, cite }: CitationCardProps) {
  const filename = cite.source_file || 'Unknown Document'
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  let linkUrl = ''
  const textParam = cite.text ? `&text=${encodeURIComponent(cite.text)}` : ''
  if (ext === 'pdf') {
    linkUrl = `/preview?file=${encodeURIComponent(filename)}&page=${cite.page || 1}`
  } else if (ext === 'pptx') {
    linkUrl = `/preview?file=${encodeURIComponent(filename)}&anchor=slide-${cite.slide || cite.page}${textParam}`
  } else if (ext === 'docx') {
    const slugify = (text: string) => {
      return "heading-" + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    }
    const anchorVal = cite.section ? slugify(cite.section) : 'docx'
    linkUrl = `/preview?file=${encodeURIComponent(filename)}&anchor=${anchorVal}${textParam}`
  } else if (ext === 'xlsx') {
    linkUrl = `/preview?file=${encodeURIComponent(filename)}&anchor=sheet-${cite.worksheet || ''}${textParam}`
  } else if (ext === 'txt') {
    linkUrl = `/preview?file=${encodeURIComponent(filename)}&anchor=txt${textParam}`
  } else {
    linkUrl = `/api/documents/${encodeURIComponent(filename)}/view`
  }

  const pageVal = ext === 'pptx' ? (cite.slide || cite.page) : ext === 'xlsx' ? (cite.worksheet || 'Sheet1') : cite.page

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-105 dark:border-gray-700 rounded-lg p-3 text-xs flex flex-col justify-between">
      <div>
        {/* Source Title */}
        <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 mb-1">
          Source {index}
        </div>
        
        {/* Document Name */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <FileText size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <span className="font-semibold text-gray-950 dark:text-white truncate" title={filename}>
            {filename}
          </span>
        </div>

        {/* Metadata Details */}
        <div className="space-y-1 text-gray-600 dark:text-gray-300 font-medium pl-1 mb-2">
          {cite.section ? (
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-normal">Section: </span>
              {cite.section}
            </div>
          ) : (
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-normal">Section: </span>
              General
            </div>
          )}
          <div>
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              {ext === 'pptx' ? 'Slide: ' : ext === 'xlsx' ? 'Worksheet: ' : 'Page: '}
            </span>
            {pageVal}
          </div>
        </div>
      </div>

      {/* Link */}
      <div className="pt-1.5 border-t border-gray-50 dark:border-gray-700/60 mt-auto flex items-center justify-between">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-purple-500 hover:text-purple-700 transition-colors font-semibold"
          title={`Open ${filename}`}
        >
          Go to source <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}

function cleanIntroductoryPhrases(text: string): string {
  let cleaned = text.trim();

  const patterns = [
    /^(based\s+on\s+the\s+(provided\s+|uploaded\s+|retrieved\s+)?(context|documents?|files?|information|text)[,\s]*)+/i,
    /^(according\s+to\s+the\s+(provided\s+|uploaded\s+|retrieved\s+)?(context|documents?|files?|information|text)[,\s]*)+/i,
    /^(in\s+the\s+(provided\s+|uploaded\s+)?(context|documents?|files?)[,\s]*)+/i,
    /^(based\s+on\s+our\s+context[,\s]*)+/i,
    /^(according\s+to\s+our\s+documents?[,\s]*)+/i,
    /^(here\s+is\s+the\s+answer:?\s*)+/i,
    /^(here\s+is\s+a\s+(direct\s+)?answer:?\s*)+/i,
    /^(here\s+is\s+a\s+summary\s+of\s+the\s+answer:?\s*)+/i,
    /^(according\s+to\s+the\s+information\s+provided[,\s]*)+/i,
    /^(based\s+on\s+the\s+information\s+provided[,\s]*)+/i,
    /^(referring\s+to\s+the\s+(provided\s+|uploaded\s+)?(context|documents?|files?)[,\s]*)+/i,
    /^(based\s+on\s+the\s+context\s+provided[,\s]*)+/i,
    /^(according\s+to\s+the\s+context\s+provided[,\s]*)+/i,
    /^(the\s+(provided\s+|uploaded\s+|retrieved\s+)?(context|documents?|files?)\s+(states?|shows?|indicates?|provides?|explains?|details?)\s+that[,\s]*)+/i,
    /^(from\s+the\s+(provided\s+|uploaded\s+|retrieved\s+)?(context|documents?|files?)[,\s]*)+/i
  ];

  let matchFound = true;
  while (matchFound) {
    matchFound = false;
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        matchFound = true;
      }
    }
  }

  // Clean up any remaining leading punctuation like commas or spaces
  cleaned = cleaned.replace(/^[,\s.:;-]+/, '').trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

interface MarkdownRendererProps {
  content: string
}

function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const cleanedContent = cleanIntroductoryPhrases(content)
  const parts = cleanedContent.split(/(```[\s\S]*?```)/g)

  const renderTextWithInlineFormatting = (text: string) => {
    const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g
    const segments = text.split(inlineRegex)
    return segments.map((seg, sIdx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return (
          <strong key={sIdx} className="font-semibold text-black dark:text-white">
            {seg.slice(2, -2)}
          </strong>
        )
      } else if (seg.startsWith('`') && seg.endsWith('`')) {
        return (
          <code key={sIdx} className="bg-gray-150 dark:bg-gray-800/80 px-1 py-0.5 rounded text-sm border border-gray-200 dark:border-gray-700/40 text-black dark:text-white">
            {seg.slice(1, -1)}
          </code>
        )
      } else {
        return seg
      }
    })
  }

  return (
    <div className="text-black dark:text-white text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n')
          const hasLang = lines.length > 0 && /^[a-zA-Z0-9_-]+$/.test(lines[0])
          const codeLines = hasLang ? lines.slice(1) : lines
          const code = codeLines.join('\n')

          return (
            <pre key={index} className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700/50 text-sm leading-normal my-3 text-black dark:text-white">
              <code className="text-black dark:text-white">{code}</code>
            </pre>
          )
        }

        const lines = part.split('\n')
        const elements: React.ReactNode[] = []
        let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null

        const flushList = (key: number) => {
          if (currentList) {
            const ListTag = currentList.type
            const listClasses = currentList.type === 'ul' ? 'list-disc pl-5' : 'list-decimal pl-5'
            elements.push(
              <ListTag key={`list-${key}`} className={`${listClasses} space-y-3 my-4`}>
                {currentList.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-black dark:text-white">
                    {item}
                  </li>
                ))}
              </ListTag>
            )
            currentList = null
          }
        }

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const trimmed = line.trim()

          if (!trimmed) {
            flushList(i)
            continue
          }

          // Check for headers
          const headerMatch = line.match(/^(#{1,3})\s+(.*)$/)
          if (headerMatch) {
            flushList(i)
            const level = headerMatch[1].length
            const headingText = headerMatch[2]
            const headingContent = renderTextWithInlineFormatting(headingText)

            if (level === 1) {
              elements.push(<h1 key={i} className="text-sm font-bold text-black dark:text-white mt-4 mb-2">{headingContent}</h1>)
            } else if (level === 2) {
              elements.push(<h2 key={i} className="text-sm font-bold text-black dark:text-white mt-3.5 mb-2">{headingContent}</h2>)
            } else {
              elements.push(<h3 key={i} className="text-sm font-semibold text-black dark:text-white mt-3 mb-1.5">{headingContent}</h3>)
            }
            continue
          }

          // Check for bullet list
          const bulletMatch = line.match(/^[-*+]\s+(.*)$/)
          if (bulletMatch) {
            const itemText = bulletMatch[1]
            const itemContent = renderTextWithInlineFormatting(itemText)
            if (currentList && currentList.type === 'ul') {
              currentList.items.push(itemContent)
            } else {
              flushList(i)
              currentList = { type: 'ul', items: [itemContent] }
            }
            continue
          }

          // Check for numbered list
          const numberMatch = line.match(/^(\d+)\.\s+(.*)$/)
          if (numberMatch) {
            const itemText = numberMatch[2]
            const itemContent = renderTextWithInlineFormatting(itemText)
            if (currentList && currentList.type === 'ol') {
              currentList.items.push(itemContent)
            } else {
              flushList(i)
              currentList = { type: 'ol', items: [itemContent] }
            }
            continue
          }

          // Normal paragraph text
          flushList(i)
          elements.push(
            <p key={i} className="text-black dark:text-white mb-4 last:mb-0">
              {renderTextWithInlineFormatting(line)}
            </p>
          )
        }
        flushList(lines.length)

        return <div key={index}>{elements}</div>
      })}
    </div>
  )
}

// Helper to safely load persisted chat state
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

export default function Chat() {
  const {
    conversations,
    activeId,
    activeQueries,
    documents,
    selectedDocs,
    multiDoc,
    showCitations,
    newConversation,
    setActiveId,
    setSelectedDocs,
    setConversations,
    sendChatQuery,
    user
  } = useGlobalState()

  const [searchParams, setSearchParams] = useSearchParams()
  const queryId = searchParams.get('id')
  const msgIdToScrollRef = useRef<string | null>(searchParams.get('msgId'))

  const [input, setInput] = useState('')
  const [docSelectionError, setDocSelectionError] = useState<string | null>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [showQnNav, setShowQnNav] = useState(false)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollbarClickRef = useRef(false)
  const scrollTopOnDownRef = useRef(0)

  const { scrollPositions, saveScrollPosition } = useGlobalState()

  const activeConv = conversations.find(c => c.id === activeId) ?? conversations[0]
  const messages = activeConv?.messages ?? INITIAL
  const loading = !!activeQueries[activeId]

  const [showAllMessages, setShowAllMessages] = useState(false)
  useEffect(() => {
    setShowAllMessages(false)
  }, [activeId])

  let displayMessages = messages
  let hasHiddenMessages = false
  if (!showAllMessages && messages.length > 0) {
    let userMsgCount = 0
    let foundIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgCount++
        if (userMsgCount === 3) {
          foundIndex = i
          break
        }
      }
    }
    if (foundIndex > 0) {
      displayMessages = messages.slice(foundIndex)
      hasHiddenMessages = true
    }
  }

  const availableDocs = documents.filter(d => d.status === 'Indexed')

  // Handle conversation navigation via URL parameter (e.g. from notification)
  useEffect(() => {
    if (queryId) {
      const idNum = Number(queryId)
      const targetId = isNaN(idNum) ? queryId : idNum
      if (conversations.some(c => c.id === targetId)) {
        setActiveId(targetId)
      }
      
      const msgId = searchParams.get('msgId')
      if (msgId) {
        msgIdToScrollRef.current = msgId
      } else {
        setSearchParams({}, { replace: true })
      }
    }
  }, [queryId, conversations, setActiveId, setSearchParams])

  // Handle scrolling to and highlighting specific target messages (from notifications)
  useEffect(() => {
    if (msgIdToScrollRef.current && !loading && messages.length > 0) {
      const targetMsgId = msgIdToScrollRef.current
      const timer = setTimeout(() => {
        const el = document.getElementById(`msg-${targetMsgId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('highlight-message')
          setTimeout(() => {
            el.classList.remove('highlight-message')
          }, 3500)
          msgIdToScrollRef.current = null
          setSearchParams({}, { replace: true })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [messages, loading, setSearchParams])

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }

  const scrollToBottomSmooth = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (container) {
      saveScrollPosition(activeId, container.scrollTop)
      const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 150
      setShowScrollBottom(!isNearBottom)
    }
  }

  // --- Scrollbar Click Question Navigator ---
  const handleScrollAreaMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    // clientWidth excludes scrollbar, so clicks beyond it are on the scrollbar
    if (e.clientX >= rect.left + container.clientWidth) {
      scrollbarClickRef.current = true
      scrollTopOnDownRef.current = container.scrollTop
    } else {
      scrollbarClickRef.current = false
      setShowQnNav(false)
    }
  }

  const handleScrollAreaMouseUp = () => {
    if (!scrollbarClickRef.current) return
    scrollbarClickRef.current = false
    const container = scrollContainerRef.current
    if (!container) return
    const scrollDiff = Math.abs(container.scrollTop - scrollTopOnDownRef.current)
    if (scrollDiff < 5) {
      // Click without drag → toggle question navigator
      setShowQnNav(prev => !prev)
    }
  }

  const userQuestions = messages
    .map((m, idx) => ({ text: m.content, role: m.role, id: m.id, idx }))
    .filter(q => q.role === 'user')
    .map(q => ({
      text: q.text,
      elementId: q.id ? `msg-${q.id}` : `msg-idx-${q.idx}`
    }))

  const jumpToQuestion = (elementId: string) => {
    setShowQnNav(false)
    setTimeout(() => {
      const container = scrollContainerRef.current
      const el = document.getElementById(elementId)
      if (container && el) {
        container.scrollTop = Math.max(0, el.offsetTop - 60)
        el.classList.add('highlight-message')
        setTimeout(() => el.classList.remove('highlight-message'), 3500)
      }
    }, 100)
  }

  // Restore scroll position on conversation switch or mount
  const lastActiveIdRef = useRef<string | number | null>(null)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const savedPos = scrollPositions[activeId]
    if (savedPos !== undefined) {
      container.scrollTop = savedPos
    } else {
      container.scrollTop = container.scrollHeight
    }
    lastActiveIdRef.current = activeId
  }, [activeId, scrollPositions])

  // ChatGPT-style scrolling: auto-scroll only if already at the bottom or loading starts
  const prevLoadingRef = useRef(loading)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    if (lastActiveIdRef.current !== activeId) return

    const isAtBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 120

    if (loading && !prevLoadingRef.current) {
      scrollToBottom()
    } else if (!loading && prevLoadingRef.current) {
      if (isAtBottom) {
        scrollToBottom()
      }
    } else {
      if (isAtBottom) {
        scrollToBottom()
      }
    }
    prevLoadingRef.current = loading
  }, [messages, loading, activeId])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const q = text.trim()

    // REQUIRE DOCUMENT SELECTION VALIDATION
    if (selectedDocs.length === 0) {
      setConversations(prev =>
        prev.map(c =>
          c.id === activeId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { role: 'user', content: q },
                  {
                    role: 'assistant',
                    content: "Please select at least one document before asking a question.",
                    error: true
                  }
                ]
              }
            : c
        )
      )
      setInput('')
      return
    }

    setInput('')
    // FIX: send the actual conversation id as the backend session_id, instead
    // of a random value generated once per component mount. This is what ties
    // "which conversation this is" in the sidebar to "which conversation this
    // is" on the server, so all Q&A for one conversation stays grouped, and
    // "New Conversation" actually starts a new one on the backend too.
    await sendChatQuery(q, String(activeId))
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white">AL Docbot</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ask questions about your indexed documents</p>
      </div>

      <div className="flex gap-3" style={{ height: 'calc(100vh - 180px)' }}>

        {/* Conversation sidebar */}
        <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Conversations</span>
            <button onClick={newConversation} className="text-purple-600 hover:text-purple-700" title="New conversation">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 border-b border-gray-100 dark:border-gray-800">
            {conversations.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={clsx(
                  'p-2 rounded-lg cursor-pointer mb-1',
                  activeId === c.id ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <div className={clsx(
                  'text-xs font-medium truncate',
                  activeId === c.id ? 'text-purple-600' : 'text-gray-800 dark:text-gray-200'
                )}>
                  {c.title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {/* FIX: count actual user questions instead of doing
                      `messages.length - 1` (assumes a local greeting message
                      that isn't present on conversations loaded from the
                      backend, producing 0 or negative counts like "-1
                      messages"). */}
                  {(() => {
                    const qCount = c.messages.filter(m => m.role === 'user').length
                    return `${qCount} message${qCount !== 1 ? 's' : ''}`
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Document selection filter */}
          <div className="p-3 bg-gray-50/50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800/60 flex flex-col" style={{ maxHeight: '45%' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Filter size={11} className="text-purple-600" />
                <span>Select Document</span>
              </div>
              {selectedDocs.length > 0 && (
                <button
                  onClick={() => { setSelectedDocs([]); setDocSelectionError(null); }}
                  className="text-[10px] text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear Filter
                </button>
              )}
            </div>
            {availableDocs.length === 0 ? (
              <div className="text-[11px] text-gray-400 dark:text-gray-400 italic py-1">
                No documents uploaded.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-40 pr-1">
                {availableDocs.length > 1 && (
                  <label
                    className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-semibold cursor-pointer select-none pb-1.5 border-b border-gray-100 dark:border-gray-800/40 mb-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.length === availableDocs.length}
                      onChange={(e) => {
                        if (!multiDoc) {
                          setDocSelectionError("Multi-document search is disabled in settings. You may select only one document.")
                          return
                        }
                        setDocSelectionError(null)
                        if (e.target.checked) {
                          setSelectedDocs(availableDocs.map(d => d.name))
                        } else {
                          setSelectedDocs([])
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Select All</span>
                  </label>
                )}
                {availableDocs.map(doc => {
                  const isChecked = selectedDocs.includes(doc.name)
                  return (
                    <label
                      key={doc.id}
                      className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (!multiDoc && !isChecked && selectedDocs.length >= 1) {
                            setDocSelectionError("Multi-document search is disabled in settings. You may select only one document.")
                            return
                          }
                          setDocSelectionError(null)
                          setSelectedDocs(prev =>
                            isChecked
                              ? prev.filter(name => name !== doc.name)
                              : (multiDoc ? [...prev, doc.name] : [doc.name])
                          )
                        }}
                        className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="truncate" title={doc.name}>
                        {doc.name}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            {docSelectionError && (
              <div className="text-[10px] text-red-500 font-medium mt-1">
                {docSelectionError}
              </div>
            )}
            {selectedDocs.length > 0 && !docSelectionError && (
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/40">
                Searching {selectedDocs.length} selected document{selectedDocs.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col overflow-hidden relative">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">AL Docbot</div>
              <div className="text-xs text-gray-400">Searching across indexed documents</div>
            </div>
            {user?.role === 'Admin' && (
              <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 px-2.5 py-1 rounded-full font-mono">
                llama3.2 · local
              </span>
            )}
          </div>

          {/* Messages */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            onMouseDown={handleScrollAreaMouseDown}
            onMouseUp={handleScrollAreaMouseUp}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {hasHiddenMessages && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={() => setShowAllMessages(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                >
                  Load older messages
                </button>
              </div>
            )}
            {displayMessages.map((m, i) => {
              const originalIndex = messages.indexOf(m)
              return (
                <div 
                  key={i} 
                  id={m.id ? `msg-${m.id}` : `msg-idx-${originalIndex}`}
                  className={clsx('flex gap-2.5 items-start transition-all', m.role === 'user' && 'flex-row-reverse')}
                >
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5',
                  m.role === 'assistant'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                )}>
                  {m.role === 'assistant' ? <Bot size={13} /> : 'U'}
                </div>

                <div className={m.role === 'assistant' ? 'flex-1 max-w-[85%]' : 'max-w-[75%]'}>
                  {m.role === 'assistant' && !m.error ? (
                    <div className="text-gray-850 dark:text-gray-205 py-1">
                      <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Answer
                      </div>
                      <MarkdownRenderer content={m.content} />
                    </div>
                  ) : (
                    <div className={clsx(
                      'px-3.5 py-2.5 rounded-xl text-sm leading-relaxed',
                      m.role === 'assistant'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800'
                        : 'bg-purple-600 text-white'
                    )}>
                      {m.error && <AlertCircle size={13} className="inline mr-1 mb-0.5" />}
                      {m.content}
                    </div>
                  )}

                  {/* Citations */}
                  {showCitations && m.citations && m.citations.length > 0 && (
                    <div className="mt-4 space-y-2.5">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Source References
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {m.citations.map((cite, index) => (
                          <CitationCard
                            key={index}
                            index={index + 1}
                            cite={cite}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Scroll to Bottom button */}
          {showScrollBottom && (
            <button
              onClick={scrollToBottomSmooth}
              className="absolute bottom-20 right-6 w-9 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 shadow-md hover:shadow-lg transition-all z-20 cursor-pointer"
              title="Scroll to bottom"
            >
              <ArrowDown size={16} />
            </button>
          )}

          {/* Question Navigator Popup */}
          {showQnNav && (
            <div className="absolute top-14 right-4 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Questions in Chat</span>
                <button
                  onClick={() => setShowQnNav(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {userQuestions.length === 0 ? (
                  <div className="text-[11px] text-gray-400 italic px-1">No questions asked yet.</div>
                ) : (
                  userQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => jumpToQuestion(q.elementId)}
                      className="w-full text-left text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded px-2 py-1.5 truncate block font-medium transition-colors"
                      title={q.text}
                    >
                      {idx + 1}. {q.text}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                }}
                placeholder="Ask anything about your documents…"
                rows={1}
                disabled={loading}
                className="flex-1 input resize-none py-2"
                style={{ minHeight: '38px', maxHeight: '120px' }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}