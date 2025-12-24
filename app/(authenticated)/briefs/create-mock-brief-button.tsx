'use client'

import { Button } from '@/components/ui/button'
import { createMockBrief } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'

export function CreateMockBriefButton({ dealId }: { dealId: string }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleCreate = async () => {
        setIsLoading(true)
        const result = await createMockBrief(dealId)
        setIsLoading(false)

        if (result.success) {
            router.refresh()
        }
    }

    return (
        <Button onClick={handleCreate} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Generating...' : 'Create Mock Brief'}
        </Button>
    )
}
