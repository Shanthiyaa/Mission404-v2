import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Plus, FileText, AlertCircle, ExternalLink, Filter } from 'lucide-react'
import clsx from 'clsx'
import { queryDocuments, listDocuments } from '../api/client'
import type { Message } from '../types'
import type { Document } from '../api/client'

const SUGGESTIONS = [
  'What changed in the latest release?',
  'How to configure BGP peer?',
  'What is the OSPF hello timer?',
]

const INITIAL: Message[] = [
  {
    role: 'assistant',
    content: "Hello! I'm your Ale Docbot. Ask me anything about your uploaded user guides, release notes, SQA test cases, and KCS articles.",
  },
]

interface ConversationEntry {
  id: number
  title: string
  messages: Message[]
}

interface GroupedFileSourceCardProps {
  filename: string
  citations: any[]
}

function GroupedFileSourceCard({ filename, citations }: GroupedFileSourceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-100 dark:border-gray-700/60">
        <FileText size={14} className="text-purple-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[190px]" title={filename}>
          {filename}
        </span>
        <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded ml-auto">
          {citations.length} {citations.length === 1 ? 'finding' : 'findings'}
        </span>
      </div>

      {/* Findings list */}
      <div className="space-y-3">
        {citations.map((cite, ci) => {
          const anchor = cite.pdf_anchor ?? ("#page=" + cite.page)
          const pdfUrl = "/api/documents/" + encodeURIComponent(cite.source_file) + "/view" + anchor
          return (
            <div key={ci} className="text-xs border-b border-gray-50 dark:border-gray-850 last:border-b-0 pb-2 last:pb-0">
              <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 font-medium mb-1">
                <span>
                  Page {cite.page} {cite.section ? `· Section: ${cite.section}` : ''}
                </span>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-purple-500 hover:text-purple-700 transition-colors font-semibold"
                  title={`Open ${cite.source_file} at page ${cite.page}`}
                >
                  Go to source <ExternalLink size={10} />
                </a>
              </div>
              <div className="border-l-2 border-purple-200 dark:border-purple-800 pl-2 bg-gray-50/50 dark:bg-gray-900/20 p-2 rounded-r">
                <p className="text-xs text-gray-700 dark:text-gray-300 italic whitespace-pre-wrap leading-relaxed">
                  {cite.text}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-1 bg-green-500 rounded-full"
                    style={{ width: cite.confidence + "%" }}
                  />
                </div>
                <span className="text-[10px] text-gray-405 dark:text-gray-400">{cite.confidence}% match</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Chat() {
  const [conversations, setConversations] = useState<ConversationEntry[]>([
    { id: 1, title: 'New conversation', messages: INITIAL },
  ])
  const [activeId, setActiveId] = useState(1)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sessionId]             = useState(() => Math.random().toString(36).slice(2))
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  const [availableDocs, setAvailableDocs] = useState<Document[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])

  const activeConv = conversations.find(c => c.id === activeId)!
  const messages   = activeConv?.messages ?? INITIAL

  useEffect(() => {
    listDocuments()
      .then(docs => {
        setAvailableDocs(docs.filter(d => d.status === 'Indexed'))
      })
      .catch(err => console.error('Failed to load documents', err))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const updateMessages = (id: number, updater: (msgs: Message[]) => Message[]) => {
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, messages: updater(c.messages) } : c)
    )
  }

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const q = text.trim()
    setInput('')

    updateMessages(activeId, msgs => [...msgs, { role: 'user', content: q }])
    setLoading(true)

    if (activeConv.title === 'New conversation') {
      setConversations(prev =>
        prev.map(c => c.id === activeId
          ? { ...c, title: q.length > 40 ? q.slice(0, 40) + '…' : q }
          : c
        )
      )
    }

    try {
      const res = await queryDocuments(q, sessionId, undefined, selectedDocs)
      updateMessages(activeId, msgs => [
        ...msgs,
        {
          role:       'assistant',
          content:    res.answer,
          citations:  res.citations,
          confidence: res.confidence,
        },
      ])
    } catch (e: any) {
      updateMessages(activeId, msgs => [
        ...msgs,
        {
          role:    'assistant',
          content: e.message?.includes('No documents')
            ? 'No documents have been indexed yet. Please upload a PDF first.'
            : e.message?.includes('LLM unavailable')
            ? 'The Ollama LLM is not reachable. Make sure Ollama is running: `ollama serve`'
            : 'Something went wrong: ' + e.message,
          error: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const newConversation = () => {
    const id = Date.now()
    setConversations(prev => [...prev, { id, title: 'New conversation', messages: INITIAL }])
    setActiveId(id)
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white">Ale Docbot</h1>
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
                  {c.messages.length - 1} message{c.messages.length !== 2 ? 's' : ''}
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
                  onClick={() => setSelectedDocs([])}
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
                          setSelectedDocs(prev =>
                            isChecked
                              ? prev.filter(name => name !== doc.name)
                              : [...prev, doc.name]
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
            {selectedDocs.length > 0 && (
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/40">
                Searching {selectedDocs.length} selected document{selectedDocs.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Ale Docbot</div>
              <div className="text-xs text-gray-400">Searching across indexed documents</div>
            </div>
            <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 px-2.5 py-1 rounded-full font-mono">
              llama3.2 · local
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={clsx('flex gap-2.5 items-start', m.role === 'user' && 'flex-row-reverse')}>
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5',
                  m.role === 'assistant'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                )}>
                  {m.role === 'assistant' ? <Bot size={13} /> : 'U'}
                </div>

                <div className="max-w-[75%]">
                  <div className={clsx(
                    'px-3.5 py-2.5 rounded-xl text-sm leading-relaxed',
                    m.role === 'assistant'
                      ? m.error
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700'
                      : 'bg-purple-600 text-white'
                  )}>
                    {m.error && <AlertCircle size={13} className="inline mr-1 mb-0.5" />}
                    {m.content}
                  </div>

                  {/* Citations */}
                  {m.citations && m.citations.length > 0 && (() => {
                    // Group citations by source_file
                    const groups: { [filename: string]: any[] } = {}
                    m.citations.forEach(c => {
                      if (!groups[c.source_file]) {
                        groups[c.source_file] = []
                      }
                      groups[c.source_file].push(c)
                    })
                    const groupedList = Object.entries(groups)

                    return (
                      <div className="mt-2.5 space-y-2.5">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Sources
                        </div>
                        {groupedList.map(([filename, list]) => (
                          <GroupedFileSourceCard
                            key={filename}
                            filename={filename}
                            citations={list}
                          />
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))}

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
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2 mb-2 flex-wrap">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
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