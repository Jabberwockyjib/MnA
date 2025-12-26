'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSourceConnection } from '@/lib/hooks/use-source-connection'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { FolderIcon } from 'lucide-react'
import Link from 'next/link'
import { DriveFolderPicker } from './drive-folder-picker'

export function DriveSourceConfig({ dealId }: { dealId: string }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { connection: googleConn } = useGoogleConnection()
  const { connection: sourceConn, isLoading } = useSourceConnection(dealId, 'gdrive')

  const isGoogleConnected = googleConn?.is_active
  const hasFolderConfigured = sourceConn?.configuration?.folderId

  async function handleFolderSelect(folderId: string, folderPath: string) {
    // TODO: Save to database
    console.log('Selected:', folderId, folderPath)
    setPickerOpen(false)
  }

  if (isLoading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>
  }

  if (!isGoogleConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <Badge variant="secondary">Not Connected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            No Google account connected. Connect your Google account in Settings to monitor Drive folders.
          </CardDescription>
          <Link href="/settings">
            <Button variant="outline">Go to Settings</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!hasFolderConfigured) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Google Drive</CardTitle>
            <Badge variant="default">Connected</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Google account connected. Select which folder to monitor for this deal.
            </CardDescription>
            <Button onClick={() => setPickerOpen(true)}>
              Select Folder
            </Button>
          </CardContent>
        </Card>
        <DriveFolderPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleFolderSelect}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <Badge variant="default">Monitoring</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <FolderIcon className="h-4 w-4" />
            <span className="font-medium">{sourceConn.configuration?.folderPath}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              Change Folder
            </Button>
            <Button variant="outline" size="sm" onClick={() => {/* Stop monitoring */}}>
              Stop Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>
      <DriveFolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFolderSelect}
      />
    </>
  )
}
