import { getDeals, getEmailsForDeal } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Inbox, Mail, AlertCircle, Clock, User } from 'lucide-react'
import { AddMockEmailDialog } from './add-mock-email-dialog'

export default async function CommunicationsPage() {
    const deals = await getDeals()
    const activeDeal = deals[0]

    if (!activeDeal) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Active Deal</h2>
                    <p className="text-muted-foreground">Create a deal to start tracking communications.</p>
                </div>
            </div>
        )
    }

    const emails = await getEmailsForDeal(activeDeal.id)

    // Group by sentiment
    const blockers = emails.filter(e => e.is_blocker || e.sentiment === 'risk')
    const recentEmails = emails.filter(e => {
        const hoursSinceReceived = (Date.now() - new Date(e.received_at).getTime()) / (1000 * 60 * 60)
        return hoursSinceReceived <= 24
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
                    <p className="text-muted-foreground">
                        {activeDeal.name} • {emails.length} email threads
                    </p>
                </div>
                <AddMockEmailDialog dealId={activeDeal.id} />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Threads</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{emails.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Email conversations
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blockers & Risks</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{blockers.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Require attention
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentEmails.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Recent activity
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Email Threads */}
            <Card>
                <CardHeader>
                    <CardTitle>Email Threads</CardTitle>
                    <CardDescription>
                        Tracked conversations related to this deal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {emails.length === 0 ? (
                        <div className="text-center py-12">
                            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No email threads yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Email monitoring will appear here once configured
                            </p>
                            <p className="text-sm text-muted-foreground">
                                For now, you can add mock emails for testing
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {emails.map((email) => (
                                <div
                                    key={email.id}
                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{email.subject}</h3>
                                                {email.is_blocker && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                        Blocker
                                                    </Badge>
                                                )}
                                                <Badge
                                                    variant={
                                                        email.sentiment === 'risk' ? 'destructive' :
                                                        email.sentiment === 'positive' ? 'default' :
                                                        'secondary'
                                                    }
                                                    className="text-xs"
                                                >
                                                    {email.sentiment}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <User className="h-4 w-4" />
                                                <span>{email.sender}</span>
                                                <span>•</span>
                                                <Clock className="h-4 w-4" />
                                                <span>{new Date(email.received_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline">{email.status}</Badge>
                                    </div>
                                    {email.snippet && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {email.snippet}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
