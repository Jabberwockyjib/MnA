'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSourceConnection } from '@/lib/hooks/use-source-connection'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { GmailLabelPicker } from './gmail-label-picker'
import { saveGmailSource, removeGmailSource } from '@/app/(authenticated)/deals/[id]/settings/actions'
import { Tag } from 'lucide-react'
import Link from 'next/link'

export function GmailSourceConfig({ dealId }: { dealId: string }) {
  const { connection: googleConn } = useGoogleConnection()
  const { connection: sourceConn, isLoading, refetch } = useSourceConnection(dealId, 'gmail')
  const [pickerOpen, setPickerOpen] = useState(false)

  const isGoogleConnected = googleConn?.is_active
  const hasLabelsConfigured = sourceConn?.configuration?.labelIds?.length > 0

  async function handleLabelsSelect(labelIds: string[], labelNames: string[]) {
    try {
      await saveGmailSource(dealId, labelIds, labelNames)
      setPickerOpen(false)
      refetch()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  async function handleStopMonitoring() {
    if (!confirm('Stop monitoring Gmail labels?')) return

    try {
      await removeGmailSource(dealId)
      refetch()
    } catch (error) {
      console.error('Failed to remove:', error)
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

  if (!isGoogleConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <Badge variant="secondary">Not Connected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            No Google account connected. Connect your Google account in Settings to monitor Gmail labels.
          </CardDescription>
          <Link href="/settings">
            <Button variant="outline">Go to Settings</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!hasLabelsConfigured) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Gmail</CardTitle>
            <Badge variant="default">Connected</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Google account connected. Select which labels to monitor for this deal.
            </CardDescription>
            <Button onClick={() => setPickerOpen(true)}>
              Select Labels
            </Button>
          </CardContent>
        </Card>
        <GmailLabelPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleLabelsSelect}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <Badge variant="default">Monitoring</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {sourceConn.configuration.labelNames.map((name: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4" />
                <span className="font-medium">{name}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              Change Labels
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopMonitoring}
            >
              Stop Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>
      <GmailLabelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleLabelsSelect}
        initialLabelIds={sourceConn.configuration.labelIds}
      />
    </>
  )
}
