'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { CheckCircle2, ArrowRight, FolderOpen, Mail } from 'lucide-react'
import Link from 'next/link'

interface GoogleConnectionCardProps {
  initialSuccess?: string
  initialError?: string
  activeDealId?: string
  activeDealName?: string
}

export function GoogleConnectionCard({ initialSuccess, initialError, activeDealId, activeDealName }: GoogleConnectionCardProps) {
  const { connection, isLoading, refetch } = useGoogleConnection()
  const [connecting, setConnecting] = useState(false)
  const [justConnected, setJustConnected] = useState(false)

  // Handle success/error from OAuth redirect
  useEffect(() => {
    if (initialSuccess === 'google_connected') {
      toast.success('Google account connected successfully!', {
        description: 'You can now configure Drive and Gmail monitoring for your deals.',
      })
      setJustConnected(true)
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
      // Refetch connection data
      refetch()
    }

    if (initialError) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Google authorization was denied',
        oauth_no_code: 'No authorization code received',
        oauth_failed: 'Failed to complete OAuth flow',
        database_error: 'Failed to save connection',
      }
      toast.error('Connection failed', {
        description: errorMessages[initialError] || 'An unexpected error occurred',
      })
      window.history.replaceState({}, '', '/settings')
    }
  }, [initialSuccess, initialError, refetch])

  async function handleConnect() {
    setConnecting(true)
    try {
      const response = await fetch('/api/oauth/google/init', { method: 'POST' })
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Failed to connect:', error)
      toast.error('Failed to start connection')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google account? This will stop monitoring for all deals.')) {
      return
    }

    try {
      await fetch('/api/oauth/google/disconnect', { method: 'POST' })
      toast.success('Google account disconnected')
      setJustConnected(false)
      refetch()
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isConnected = connection && connection.is_active

  return (
    <Card className={justConnected ? 'border-green-500/50 bg-green-500/5' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Google Account
                {isConnected && justConnected && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
              {isConnected ? (
                <Badge variant="default" className="mt-1 bg-green-600">Connected</Badge>
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

            {/* Next Steps Section */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Next: Configure monitoring for your deals</p>
              {activeDealId ? (
                <div className="space-y-2">
                  <Link href={`/deals/${activeDealId}/settings`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Configure Drive folder</p>
                          <p className="text-xs text-muted-foreground">
                            Set up for <span className="font-medium">{activeDealName}</span>
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                  <Link href={`/deals/${activeDealId}/settings`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Configure Gmail labels</p>
                          <p className="text-xs text-muted-foreground">
                            Set up for <span className="font-medium">{activeDealName}</span>
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No active deals found. <Link href="/dashboard" className="text-primary hover:underline">Create a deal</Link> first to configure source monitoring.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={handleDisconnect}
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                Disconnect account
              </Button>
            </div>
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
