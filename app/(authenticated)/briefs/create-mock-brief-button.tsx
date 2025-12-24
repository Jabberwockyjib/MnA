'use client'

import { Button } from '@/components/ui/button'
import { createMockBrief, generateAIBrief } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'

export function CreateMockBriefButton({ dealId }: { dealId: string }) {
    const router = useRouter()
    const [isLoadingMock, setIsLoadingMock] = useState(false)
    const [isLoadingAI, setIsLoadingAI] = useState(false)

    const handleCreateMock = async () => {
        setIsLoadingMock(true)
        const result = await createMockBrief(dealId)
        setIsLoadingMock(false)

        if (result.success) {
            router.refresh()
        }
    }

    const handleGenerateAI = async () => {
        setIsLoadingAI(true)
        const result = await generateAIBrief(dealId)
        setIsLoadingAI(false)

        if (result.success) {
            router.refresh()
        }
    }

    return (
        <div className="flex gap-2">
            <Button onClick={handleCreateMock} disabled={isLoadingMock || isLoadingAI} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {isLoadingMock ? 'Creating...' : 'Mock Brief'}
            </Button>
            <Button onClick={handleGenerateAI} disabled={isLoadingMock || isLoadingAI}>
                <Sparkles className="h-4 w-4 mr-2" />
                {isLoadingAI ? 'Generating...' : 'Generate AI Brief'}
            </Button>
        </div>
    )
}
