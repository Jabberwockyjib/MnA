import { getDeals, getBriefsForDeal } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { CreateMockBriefButton } from './create-mock-brief-button'

export default async function BriefsPage() {
    const deals = await getDeals()
    const activeDeal = deals[0]

    if (!activeDeal) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Active Deal</h2>
                    <p className="text-muted-foreground">Create a deal to start receiving daily briefs.</p>
                </div>
            </div>
        )
    }

    const briefs = await getBriefsForDeal(activeDeal.id)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Briefs</h1>
                    <p className="text-muted-foreground">
                        {activeDeal.name} • {briefs.length} briefs generated
                    </p>
                </div>
                <CreateMockBriefButton dealId={activeDeal.id} />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Briefs</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{briefs.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Generated reports
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Latest Brief</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {briefs.length > 0 ? new Date(briefs[0].brief_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {briefs.length > 0 ? briefs[0].status : 'No briefs yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {briefs.length > 0
                                ? Math.round(briefs.reduce((acc, b) => acc + (b.progress_snapshot?.overall || 0), 0) / briefs.length)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Deal completion
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Briefs List */}
            <Card>
                <CardHeader>
                    <CardTitle>Brief Archive</CardTitle>
                    <CardDescription>
                        Historical daily intelligence reports
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {briefs.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No briefs yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Daily briefs will be generated automatically once source monitoring is configured
                            </p>
                            <p className="text-sm text-muted-foreground">
                                For now, you can create mock briefs for testing
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {briefs.map((brief) => {
                                const progress = brief.progress_snapshot?.overall || 0
                                const blockerCount = brief.blockers?.items?.length || 0
                                const riskCount = brief.risks?.items?.length || 0

                                return (
                                    <Link
                                        key={brief.id}
                                        href={`/briefs/${brief.id}`}
                                        className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold">
                                                        Daily Brief - {new Date(brief.brief_date).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp className="h-4 w-4" />
                                                        <span>{progress}% complete</span>
                                                    </div>
                                                    {blockerCount > 0 && (
                                                        <div className="flex items-center gap-1 text-red-600">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <span>{blockerCount} blocker{blockerCount !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    )}
                                                    {riskCount > 0 && (
                                                        <div className="flex items-center gap-1 text-orange-600">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <span>{riskCount} risk{riskCount !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant={brief.status === 'published' ? 'default' : 'secondary'}>
                                                    {brief.status}
                                                </Badge>
                                                {brief.published_at && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(brief.published_at).toLocaleTimeString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
