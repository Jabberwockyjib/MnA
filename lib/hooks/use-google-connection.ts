'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useGoogleConnection() {
  const [connection, setConnection] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchConnection() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_oauth_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

      setConnection(data)
      setIsLoading(false)
    }

    fetchConnection()
  }, [])

  return { connection, isLoading, refetch: () => window.location.reload() }
}
