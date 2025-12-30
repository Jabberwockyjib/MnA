
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateDealDialog } from '@/components/deals/create-deal-dialog'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, AlertTriangle, FileText, Clock, CheckCircle2 } from 'lucide-react'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
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

    // Fetch metrics if we have an active deal
    let metrics = {
        documentsToday: 0,
        activityCount: 0,
        blockersCount: 0,
        workstreamsCount: 0,
        teamMembersCount: 0,
        totalDocuments: 0,
    }

    if (activeDeal) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = yesterday.toISOString()

        // Fetch all metrics in parallel
        const [
            documentsResult,
            recentDocsResult,
            recentEmailsResult,
            blockersResult,
            workstreamsResult,
            teamResult,
        ] = await Promise.all([
            // Total documents
            supabase
                .from('documents')
                .select('id', { count: 'exact', head: true })
                .eq('deal_id', activeDeal.id),
            // Documents in last 24 hours
            supabase
                .from('documents')
                .select('id', { count: 'exact', head: true })
                .eq('deal_id', activeDeal.id)
                .gte('created_at', yesterdayISO),
            // Emails in last 24 hours
            supabase
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('deal_id', activeDeal.id)
                .gte('created_at', yesterdayISO),
            // Active blockers
            supabase
                .from('emails')
                .select('id', { count: 'exact', head: true })
                .eq('deal_id', activeDeal.id)
                .eq('is_blocker', true),
            // Workstreams
            supabase
                .from('workstreams')
                .select('id', { count: 'exact', head: true })
                .eq('deal_id', activeDeal.id),
            // Team members
            supabase
                .from('deal_members')
                .select('id', { count: 'exact', head: true })
                .eq('deal_id', activeDeal.id),
        ])

        metrics = {
            totalDocuments: documentsResult.count || 0,
            documentsToday: recentDocsResult.count || 0,
            activityCount: (recentDocsResult.count || 0) + (recentEmailsResult.count || 0),
            blockersCount: blockersResult.count || 0,
            workstreamsCount: workstreamsResult.count || 0,
            teamMembersCount: teamResult.count || 0,
        }
    }

    if (!activeDeal) {
        // Empty State
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="text-center space-y-3 max-w-md">
                    <h2 className="text-3xl font-serif font-bold tracking-tight">No Active Deals</h2>
                    <p className="text-muted-foreground text-base">Initialize your first deal workspace to begin monitoring intelligence.</p>
                </div>
                <CreateDealDialog />
            </div>
        )
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })

    return (
        <div className="space-y-8 pb-8">
            {/* Header - Editorial Masthead */}
            <div className="border-b-2 border-primary/20 pb-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-12 bg-primary" />
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Intelligence Brief
                            </span>
                        </div>
                        <h1 className="text-5xl font-serif font-bold tracking-tight leading-tight">
                            {activeDeal.name}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                            <span>{currentDate}</span>
                            <span className="text-border">•</span>
                            <span className="capitalize">{activeDeal.status}</span>
                        </div>
                    </div>
                    <CreateDealDialog trigger={
                        <Button variant="outline" size="sm" className="border-primary/30 hover:border-primary hover:bg-primary/5">
                            <Plus className="mr-2 h-4 w-4" /> New Deal
                        </Button>
                    } />
                </div>
            </div>

            {/* Key Metrics Grid - Information Dense */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Primary Metric - Emphasized */}
                <div className="animate-slide-in-up border-l-2 border-primary bg-card p-6 border border-border hover:border-primary/50 transition-colors" style={{ animationDelay: '0ms' }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Status
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-mono font-semibold capitalize text-foreground">
                                {activeDeal.status}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Last updated: Today
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documents Metric */}
                <div className="animate-slide-in-up bg-card p-6 border border-border hover:border-primary/30 transition-colors" style={{ animationDelay: '100ms' }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Documents
                            </span>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-mono font-semibold">
                                {metrics.documentsToday}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Last 24 hours
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Metric */}
                <div className="animate-slide-in-up bg-card p-6 border border-border hover:border-primary/30 transition-colors" style={{ animationDelay: '200ms' }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Activity
                            </span>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-mono font-semibold">
                                {metrics.activityCount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Changes detected
                            </div>
                        </div>
                    </div>
                </div>

                {/* Blockers Metric - Alert State */}
                <div className="animate-slide-in-up bg-card p-6 border border-border hover:border-destructive/30 transition-colors" style={{ animationDelay: '300ms' }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Blockers
                            </span>
                            <AlertTriangle className={`h-4 w-4 ${metrics.blockersCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="space-y-1">
                            <div className={`text-3xl font-mono font-semibold ${metrics.blockersCount > 0 ? 'text-destructive' : 'text-success'}`}>
                                {metrics.blockersCount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Requiring attention
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Information - Editorial Sections */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 animate-slide-in-up border border-border bg-card" style={{ animationDelay: '400ms' }}>
                    <div className="border-b border-border px-6 py-4">
                        <h3 className="text-lg font-serif font-semibold">Recent Activity</h3>
                        <p className="text-sm text-muted-foreground mt-1">Latest changes and updates</p>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <div className="text-center space-y-2">
                                <Clock className="h-8 w-8 mx-auto opacity-30" />
                                <p className="text-sm">No recent activity</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Insights */}
                <div className="animate-slide-in-up border border-border bg-card" style={{ animationDelay: '500ms' }}>
                    <div className="border-b border-border px-6 py-4">
                        <h3 className="text-lg font-serif font-semibold">Quick Insights</h3>
                        <p className="text-sm text-muted-foreground mt-1">At a glance</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Workstreams</span>
                                <span className="font-mono font-semibold">{metrics.workstreamsCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Team Members</span>
                                <span className="font-mono font-semibold">{metrics.teamMembersCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total Documents</span>
                                <span className="font-mono font-semibold">{metrics.totalDocuments}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
