import { getBrief } from '../../actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Calendar, TrendingUp, AlertCircle, Mail, FolderOpen, Clock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function BriefViewerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const brief = await getBrief(id)

    if (!brief) {
        notFound()
    }

    const progress = brief.progress_snapshot || {}
    const changes = brief.changes || {}
    const blockers = brief.blockers || {}
    const risks = brief.risks || {}
    const communications = brief.communications || {}

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/briefs" className="hover:text-foreground">Daily Briefs</Link>
                <span>/</span>
                <span className="text-foreground">
                    {new Date(brief.brief_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </div>

            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Daily Brief
                    </h1>
                    <Badge variant={brief.status === 'published' ? 'default' : 'secondary'}>
                        {brief.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                            {new Date(brief.brief_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                    {brief.published_at && (
                        <>
                            <span>•</span>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Published {new Date(brief.published_at).toLocaleTimeString()}</span>
                            </div>
                        </>
                    )}
                </div>
                <p className="text-muted-foreground">{brief.deals?.name}</p>
            </div>

            {/* Progress Snapshot */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Progress Snapshot
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">Overall Progress</span>
                            <span className="text-2xl font-bold">{progress.overall || 0}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                            <div
                                className="bg-primary rounded-full h-3 transition-all"
                                style={{ width: `${progress.overall || 0}%` }}
                            />
                        </div>
                    </div>

                    {progress.workstreams && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-muted-foreground">By Workstream</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(progress.workstreams).map(([name, value]) => {
                                        const percentage = Number(value)
                                        return (
                                            <div key={name} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>{name}</span>
                                                    <span className="font-semibold">{percentage}%</span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2">
                                                    <div
                                                        className="bg-primary/80 rounded-full h-2 transition-all"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* What Changed */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        What Changed
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {changes.new_documents && changes.new_documents.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Badge variant="default">{changes.new_documents.length}</Badge>
                                New Documents
                            </h4>
                            <ul className="space-y-1 ml-4">
                                {changes.new_documents.map((doc: string, idx: number) => (
                                    <li key={idx} className="text-sm flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {doc}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {changes.updated_documents && changes.updated_documents.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Badge variant="secondary">{changes.updated_documents.length}</Badge>
                                Updated Documents
                            </h4>
                            <ul className="space-y-1 ml-4">
                                {changes.updated_documents.map((doc: string, idx: number) => (
                                    <li key={idx} className="text-sm flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        {doc}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {(!changes.new_documents || changes.new_documents.length === 0) &&
                     (!changes.updated_documents || changes.updated_documents.length === 0) && (
                        <p className="text-sm text-muted-foreground">No document changes detected</p>
                    )}
                </CardContent>
            </Card>

            {/* Blockers */}
            {blockers.items && blockers.items.length > 0 && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Blockers ({blockers.items.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {blockers.items.map((blocker: any, idx: number) => (
                                <div key={idx} className="border border-red-200 rounded-lg p-3 bg-red-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-red-900">{blocker.title}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-red-700">
                                                {blocker.workstream && (
                                                    <div className="flex items-center gap-1">
                                                        <FolderOpen className="h-3 w-3" />
                                                        <span>{blocker.workstream}</span>
                                                    </div>
                                                )}
                                                {blocker.age_days !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{blocker.age_days} days old</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Risks & Exceptions */}
            {risks.items && risks.items.length > 0 && (
                <Card className="border-orange-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="h-5 w-5" />
                            Risks & Exceptions ({risks.items.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {risks.items.map((risk: any, idx: number) => (
                                <div key={idx} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-orange-900">{risk.title}</h4>
                                                <Badge variant={
                                                    risk.severity === 'high' ? 'destructive' :
                                                    risk.severity === 'medium' ? 'default' :
                                                    'secondary'
                                                }>
                                                    {risk.severity}
                                                </Badge>
                                            </div>
                                            {risk.source && (
                                                <p className="text-sm text-orange-700 flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    Source: {risk.source}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Notable Communications */}
            {communications.notable && communications.notable.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Notable Communications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {communications.notable.map((email: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-3">
                                    <h4 className="font-semibold">{email.subject}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        From: {email.sender}
                                    </p>
                                    {email.snippet && (
                                        <p className="text-sm mt-2">{email.snippet}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
