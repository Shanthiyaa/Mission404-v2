/**
 * useDocuments.ts — Shared hook for document list
 * Used by KnowledgeBase, Dashboard, and Upload pages.
 */

import { useState, useEffect, useCallback } from 'react'
import { listDocuments, deleteDocument } from '../api/client'
import type { Document } from '../types'

export function useDocuments(autoRefresh = false) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      setError(null)
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (e: any) {
      setError(e.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
    if (!autoRefresh) return
    // Poll every 4s when autoRefresh is on (during active uploads)
    const id = setInterval(fetch, 4000)
    return () => clearInterval(id)
  }, [fetch, autoRefresh])

  const remove = useCallback(async (docId: string) => {
    await deleteDocument(docId)
    setDocuments(prev => prev.filter(d => d.id !== docId))
  }, [])

  return { documents, loading, error, refresh: loadDocuments, remove }

}
