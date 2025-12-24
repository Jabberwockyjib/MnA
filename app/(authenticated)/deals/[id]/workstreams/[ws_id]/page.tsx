
import { getWorkstream, getDocuments, addDocument } from "@/app/(authenticated)/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function WorkstreamPage({
    params
}: {
    params: Promise<{ id: string, ws_id: string }>
}) {
    const { id: dealId, ws_id: workstreamId } = await params
    const workstream = await getWorkstream(workstreamId)
    const documents = await getDocuments(workstreamId)

    if (!workstream) {
        return <div>Workstream not found</div>
    }

    async function handleAddMockDoc() {
        'use server'
        await addDocument(workstreamId, dealId, `Mock Document ${Date.now()}`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold tracking-tight">{workstream.name}</h2>
                        <Badge variant="secondary" className="capitalize">{workstream.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{workstream.deals?.name}</p>
                </div>
                <form action={handleAddMockDoc}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Mock Document
                    </Button>
                </form>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Document Repository</CardTitle>
                    <CardDescription>Documents associated with the {workstream.name} workstream.</CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="font-semibold text-lg">No documents yet</h3>
                            <p className="text-muted-foreground max-w-sm">Capture documents manually or connect to a source system to see them here.</p>
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date Added</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle font-medium">{doc.name}</td>
                                            <td className="p-4 align-middle">
                                                <Badge variant="outline" className="capitalize">{doc.status}</Badge>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <Button variant="ghost" size="icon">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
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
