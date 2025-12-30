'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GoogleConnection {
  id: string
  user_id: string
  provider: string
  provider_email: string
  is_active: boolean
  last_refresh_at: string
  created_at: string
}

export function useGoogleConnection() {
  const [connection, setConnection] = useState<GoogleConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnection = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('Auth error:', userError)
        setError('Authentication error')
        setIsLoading(false)
        return
      }

      if (!user) {
        console.log('No authenticated user found')
        setIsLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('user_oauth_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

      if (queryError && queryError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected when not connected
        console.error('Query error:', queryError)
        setError('Failed to fetch connection')
      }

      setConnection(data)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  return {
    connection,
    isLoading,
    error,
    refetch: fetchConnection
  }
}
