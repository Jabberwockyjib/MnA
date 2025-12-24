import { getDocument } from '../../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FileText, Calendar, FolderOpen, ExternalLink, Clock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { UpdateDocumentStatus } from './update-status-button'

export default async function DocumentViewerPage({ params }: { params: { id: string } }) {
    const document = await getDocument(params.id)

    if (!document) {
        notFound()
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/documents" className="hover:text-foreground">Documents</Link>
                <span>/</span>
                <span className="text-foreground">{document.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FileText className="h-8 w-8" />
                        {document.name}
                    </h1>
                    <p className="text-muted-foreground">
                        {document.deals?.name}
                    </p>
                </div>
                <Badge variant={
                    document.status === 'new' ? 'default' :
                    document.status === 'updated' ? 'secondary' :
                    'outline'
                } className="text-sm px-3 py-1">
                    {document.status}
                </Badge>
            </div>

            {/* Metadata Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Workstream</p>
                            <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                <Link
                                    href={`/deals/${document.deal_id}/workstreams/${document.workstream_id}`}
                                    className="hover:underline"
                                >
                                    {document.workstreams?.name || 'Unassigned'}
                                </Link>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Source Type</p>
                            <p className="capitalize">{document.source_type}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Date Added</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {new Date(document.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {new Date(document.updated_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>

                    {document.source_url && (
                        <>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Source URL</p>
                                <a
                                    href={document.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open in {document.source_type === 'gdrive' ? 'Google Drive' : document.source_type}
                                </a>
                            </div>
                        </>
                    )}

                    {document.last_ingested_at && (
                        <>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Last Ingested</p>
                                <p className="text-sm">
                                    {new Date(document.last_ingested_at).toLocaleString()}
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle>AI-Generated Summary</CardTitle>
                    <CardDescription>
                        Automated summary of document contents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {document.summary ? (
                        <p className="text-sm leading-relaxed">{document.summary}</p>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No summary available yet.</p>
                            <p className="text-sm mt-1">Summary will be generated when document is processed.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>
                        Update document status and manage review workflow
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <UpdateDocumentStatus
                            documentId={document.id}
                            currentStatus={document.status}
                            dealId={document.deal_id}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
