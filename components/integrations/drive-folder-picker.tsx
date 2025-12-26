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
import { ChevronRight, ChevronDown, Folder } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Folder {
  id: string
  name: string
  mimeType: string
}

interface FolderPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (folderId: string, folderPath: string) => void
}

export function DriveFolderPicker({ open, onClose, onSelect }: FolderPickerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [folderCache, setFolderCache] = useState<Record<string, Folder[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !folderCache['root']) {
      fetchFolders('root')
    }
  }, [open])

  async function fetchFolders(parentId: string) {
    if (folderCache[parentId]) return

    setLoading(true)
    try {
      const response = await fetch(`/api/google/drive/folders?parentId=${parentId}`)
      const { folders } = await response.json()

      setFolderCache(prev => ({
        ...prev,
        [parentId]: folders || []
      }))
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleFolder(folderId: string) {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
      fetchFolders(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  function handleConfirm() {
    if (selectedFolder) {
      // Build path - for now just use folder name
      // TODO: Build full path using buildFolderPath
      const folder = Object.values(folderCache)
        .flat()
        .find(f => f.id === selectedFolder)

      onSelect(selectedFolder, folder?.name || selectedFolder)
    }
  }

  function renderFolder(folder: Folder, level: number = 0) {
    const isExpanded = expandedFolders.has(folder.id)
    const children = folderCache[folder.id] || []
    const hasChildren = children.length > 0 || !folderCache[folder.id]

    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 hover:bg-accent rounded-md cursor-pointer"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="p-0.5 hover:bg-accent-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <RadioGroupItem
            value={folder.id}
            id={folder.id}
            className="cursor-pointer"
          />
          <Label
            htmlFor={folder.id}
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <Folder className="h-4 w-4 text-blue-500" />
            <span>{folder.name}</span>
          </Label>
        </div>

        {isExpanded && children.map(child => renderFolder(child, level + 1))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Google Drive Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to monitor for this deal
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] border rounded-md p-4">
          <RadioGroup value={selectedFolder || ''} onValueChange={setSelectedFolder}>
            <div>
              <p className="text-sm font-semibold mb-2">My Drive</p>
              {folderCache['root']?.map(folder => renderFolder(folder))}
            </div>
          </RadioGroup>

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading folders...
            </p>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedFolder}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
