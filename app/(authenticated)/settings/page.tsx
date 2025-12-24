import { getDeals } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, Database, Mail, FolderOpen, AlertCircle } from 'lucide-react'

export default async function SettingsPage() {
    const deals = await getDeals()
    const activeDeal = deals[0]

    if (!activeDeal) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <SettingsIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Active Deal</h2>
                    <p className="text-muted-foreground">Create a deal to configure settings.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage deal configuration and integrations
                </p>
            </div>

            {/* Deal Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Deal Information</CardTitle>
                    <CardDescription>
                        Basic settings for {activeDeal.name}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Deal Name</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                defaultValue={activeDeal.name}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                disabled
                            />
                            <Button variant="outline" disabled>Update</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <div className="flex items-center gap-2">
                            <Badge variant="default">{activeDeal.status}</Badge>
                            <span className="text-sm text-muted-foreground">
                                Created {new Date(activeDeal.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Source Integrations */}
            <Card>
                <CardHeader>
                    <CardTitle>Source Integrations</CardTitle>
                    <CardDescription>
                        Connect document repositories and email systems
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Document Repository */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            Document Repository
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                                        <Database className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">Google Drive</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Connect to monitor shared folders
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline">Not Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded bg-indigo-100 flex items-center justify-center">
                                        <Database className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">SharePoint</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Connect to monitor document libraries
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline">Not Connected</Badge>
                            </div>
                        </div>
                    </div>

                    {/* Email System */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email System
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">Gmail</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Monitor deal-related email threads
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline">Not Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">Outlook</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Monitor deal-related email threads
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline">Not Connected</Badge>
                            </div>
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-blue-900">Integration Setup Required</p>
                            <p className="text-blue-700 mt-1">
                                Source monitoring integrations are not yet implemented.
                                This will enable automatic document and email tracking for daily briefs.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Daily Brief Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Brief</CardTitle>
                    <CardDescription>
                        Configure automated daily intelligence reports
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Time</label>
                        <div className="flex gap-2">
                            <input
                                type="time"
                                defaultValue="08:00"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                disabled
                            />
                            <Button variant="outline" disabled>Update</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Daily briefs will be generated and emailed at this time
                        </p>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <h4 className="font-medium">Email Delivery</h4>
                            <p className="text-sm text-muted-foreground">
                                Send daily briefs to all team members
                            </p>
                        </div>
                        <Badge variant="outline">Coming Soon</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>
                        Irreversible actions for this deal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div>
                            <h4 className="font-medium">Archive Deal</h4>
                            <p className="text-sm text-muted-foreground">
                                Mark this deal as closed and stop monitoring
                            </p>
                        </div>
                        <Button variant="destructive" disabled>
                            Archive
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
