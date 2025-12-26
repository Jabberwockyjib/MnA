'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Label {
  id: string
  name: string
}

interface LabelPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (labelIds: string[], labelNames: string[]) => void
  initialLabelIds?: string[]
}

export function GmailLabelPicker({ open, onClose, onSelect, initialLabelIds = [] }: LabelPickerProps) {
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set(initialLabelIds))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchLabels()
    }
  }, [open])

  async function fetchLabels() {
    setLoading(true)
    try {
      const response = await fetch('/api/google/gmail/labels')
      const { labels: fetchedLabels } = await response.json()
      setLabels(fetchedLabels || [])
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleLabel(labelId: string) {
    const newSelected = new Set(selectedLabelIds)
    if (newSelected.has(labelId)) {
      newSelected.delete(labelId)
    } else {
      newSelected.add(labelId)
    }
    setSelectedLabelIds(newSelected)
  }

  function handleConfirm() {
    const selectedIds = Array.from(selectedLabelIds)
    const selectedNames = labels
      .filter(l => selectedLabelIds.has(l.id))
      .map(l => l.name)

    onSelect(selectedIds, selectedNames)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Gmail Labels</DialogTitle>
          <DialogDescription>
            Choose labels to monitor for this deal
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] border rounded-md p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading labels...
            </p>
          ) : (
            <div className="space-y-3">
              {labels.map(label => (
                <div key={label.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={label.id}
                    checked={selectedLabelIds.has(label.id)}
                    onCheckedChange={() => toggleLabel(label.id)}
                  />
                  <Label
                    htmlFor={label.id}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {label.name}
                  </Label>
                </div>
              ))}

              {labels.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels found. Create labels in Gmail first.
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Selected: {selectedLabelIds.size} label{selectedLabelIds.size !== 1 ? 's' : ''}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-900">
              💡 <strong>Tip:</strong> Only emails with these labels will be monitored.
              Create and apply labels in Gmail to organize deal communications.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedLabelIds.size === 0}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
