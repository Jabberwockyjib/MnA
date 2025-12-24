'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addMockEmail } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'

export function AddMockEmailDialog({ dealId }: { dealId: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)
        const subject = formData.get('subject') as string
        const sender = formData.get('sender') as string
        const snippet = formData.get('snippet') as string

        const result = await addMockEmail(dealId, subject, sender, snippet)

        setIsLoading(false)

        if (result.success) {
            setOpen(false)
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mock Email
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Mock Email</DialogTitle>
                    <DialogDescription>
                        Create a test email thread for development purposes
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            name="subject"
                            placeholder="RE: Contract review deadline"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sender">Sender</Label>
                        <Input
                            id="sender"
                            name="sender"
                            placeholder="john.doe@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="snippet">Snippet</Label>
                        <Input
                            id="snippet"
                            name="snippet"
                            placeholder="We need to review section 3.2 before Friday..."
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add Email'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
