import { getDeals, getAllDocumentsForDeal, getWorkstreams } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, FolderOpen } from 'lucide-react'
import Link from 'next/link'

export default async function DocumentsPage() {
    const deals = await getDeals()
    const activeDeal = deals[0]

    if (!activeDeal) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Active Deal</h2>
                    <p className="text-muted-foreground">Create a deal to start managing documents.</p>
                </div>
            </div>
        )
    }

    const documents = await getAllDocumentsForDeal(activeDeal.id)
    const workstreams = await getWorkstreams(activeDeal.id)

    // Group documents by status
    const newDocs = documents.filter(d => d.status === 'new')
    const updatedDocs = documents.filter(d => d.status === 'updated')
    const reviewedDocs = documents.filter(d => d.status === 'reviewed')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                <p className="text-muted-foreground">
                    {activeDeal.name} • {documents.length} documents
                </p>
            </div>

            {/* Status Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Documents</CardTitle>
                        <Badge variant="default">{newDocs.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{newDocs.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Require review
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Updated Documents</CardTitle>
                        <Badge variant="secondary">{updatedDocs.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{updatedDocs.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Changed recently
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reviewed Documents</CardTitle>
                        <Badge variant="outline">{reviewedDocs.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reviewedDocs.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Up to date
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Documents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Documents</CardTitle>
                    <CardDescription>
                        View and manage documents across all workstreams
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Add documents to workstreams to track changes and reviews
                            </p>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs uppercase bg-muted">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Document Name</th>
                                        <th className="px-6 py-3 text-left">Workstream</th>
                                        <th className="px-6 py-3 text-left">Status</th>
                                        <th className="px-6 py-3 text-left">Date Added</th>
                                        <th className="px-6 py-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="border-b hover:bg-muted/50">
                                            <td className="px-6 py-4 font-medium flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {doc.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                                    {doc.workstreams?.name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    doc.status === 'new' ? 'default' :
                                                    doc.status === 'updated' ? 'secondary' :
                                                    'outline'
                                                }>
                                                    {doc.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link href={`/documents/${doc.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
