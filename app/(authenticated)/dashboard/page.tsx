
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CreateDealDialog } from '@/components/deals/create-deal-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DEV_USER_ID } from '@/lib/constants'

export default async function DashboardPage() {
    const supabase = await createClient()
    // const { data: { user } } = await supabase.auth.getUser()
    const user = { id: DEV_USER_ID }

    if (!user) {
        return <div>Please login</div>
    }

    // Fetch the most recent active deal for this user
    const { data: deals } = await supabase
        .from('deals')
        .select(`
        *,
        deal_members!inner(user_id)
    `)
        .eq('deal_members.user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

    const activeDeal = deals?.[0]

    if (!activeDeal) {
        // Empty State
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">No Active Deals</h2>
                    <p className="text-muted-foreground">Get started by creating your first deal workspace.</p>
                </div>
                <CreateDealDialog />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">{activeDeal.name}</h2>
                <div className="flex items-center gap-2">
                    <CreateDealDialog trigger={<Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> New Deal</Button>} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Deal Status</CardTitle>
                        <CardDescription>Overall progress</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{activeDeal.status}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Documents</CardTitle>
                        <CardDescription>Last 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Blockers</CardTitle>
                        <CardDescription>Requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">0</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
