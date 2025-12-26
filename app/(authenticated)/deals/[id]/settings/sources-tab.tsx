'use client'

import { DriveSourceConfig } from '@/components/integrations/drive-source-config'

export function SourcesTab({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which Google Drive folders and Gmail labels to monitor for this deal.
      </p>

      <DriveSourceConfig dealId={dealId} />
    </div>
  )
}
