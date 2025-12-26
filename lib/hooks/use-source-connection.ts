'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SourceConnection {
  id: string
  deal_id: string
  source_type: 'gdrive' | 'gmail' | 'sharepoint' | 'outlook'
  configuration: {
    folderId?: string
    folderPath?: string
    labelIds?: string[]
    labelNames?: string[]
  } | null
  is_active: boolean
  user_oauth_connection_id: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  folder_id: string | null
  created_at: string
  updated_at: string
}

export function useSourceConnection(dealId: string, sourceType: 'gdrive' | 'gmail') {
  // Input validation
  if (!dealId?.trim()) {
    throw new Error('Deal ID is required')
  }

  const [connection, setConnection] = useState<SourceConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function fetchConnection() {
      const supabase = createClient()

      const { data } = await supabase
        .from('source_connections')
        .select('*')
        .eq('deal_id', dealId)
        .eq('source_type', sourceType)
        .single()

      setConnection(data as SourceConnection | null)
      setIsLoading(false)
    }

    fetchConnection()
  }, [dealId, sourceType, refreshTrigger])

  const refetch = () => setRefreshTrigger(prev => prev + 1)

  return { connection, isLoading, refetch }
}
