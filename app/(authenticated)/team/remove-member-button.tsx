'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { removeDealMember } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export function RemoveMemberButton({
    memberId,
    dealId,
    memberName
}: {
    memberId: string
    dealId: string
    memberName: string
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleRemove = async () => {
        setIsLoading(true)
        const result = await removeDealMember(memberId, dealId)
        setIsLoading(false)

        if (result.success) {
            setOpen(false)
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Remove Team Member</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove {memberName} from this deal?
                        They will lose all access immediately.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRemove}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Removing...' : 'Remove Member'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
