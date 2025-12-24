'use client'

import { Button } from '@/components/ui/button'
import { updateDocumentStatus } from '../../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle, Circle, FileEdit } from 'lucide-react'

export function UpdateDocumentStatus({
    documentId,
    currentStatus,
    dealId
}: {
    documentId: string
    currentStatus: string
    dealId: string
}) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleStatusChange = async (newStatus: string) => {
        setIsLoading(true)
        const result = await updateDocumentStatus(documentId, newStatus, dealId)
        setIsLoading(false)

        if (result.success) {
            router.refresh()
        }
    }

    return (
        <div className="flex gap-2 flex-wrap">
            {currentStatus !== 'new' && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('new')}
                    disabled={isLoading}
                >
                    <Circle className="h-4 w-4 mr-2" />
                    Mark as New
                </Button>
            )}
            {currentStatus !== 'updated' && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('updated')}
                    disabled={isLoading}
                >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Mark as Updated
                </Button>
            )}
            {currentStatus !== 'reviewed' && (
                <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStatusChange('reviewed')}
                    disabled={isLoading}
                >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                </Button>
            )}
        </div>
    )
}
