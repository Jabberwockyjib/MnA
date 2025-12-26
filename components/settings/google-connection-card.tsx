'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { formatDistanceToNow } from 'date-fns'

export function GoogleConnectionCard() {
  const { connection, isLoading, refetch } = useGoogleConnection()
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    try {
      const response = await fetch('/api/oauth/google/init', { method: 'POST' })
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Failed to connect:', error)
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google account? This will stop monitoring for all deals.')) {
      return
    }

    try {
      await fetch('/api/oauth/google/disconnect', { method: 'POST' })
      refetch()
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isConnected = connection && connection.is_active

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
              {/* Google icon placeholder */}
              <span className="text-xl">G</span>
            </div>
            <div>
              <CardTitle>Google Account</CardTitle>
              {isConnected ? (
                <Badge variant="default" className="mt-1">Connected</Badge>
              ) : (
                <Badge variant="secondary" className="mt-1">Not connected</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Connected as {connection.provider_email}
              </p>
              <p className="text-sm text-muted-foreground">
                Access to: Google Drive, Gmail
              </p>
              <p className="text-xs text-muted-foreground">
                Last refreshed: {formatDistanceToNow(new Date(connection.last_refresh_at))} ago
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <CardDescription>
              Connect your Google account to monitor Drive folders and Gmail labels for your deals.
            </CardDescription>
            <Button
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect Google Account'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
