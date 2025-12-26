import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SourcesTab } from './sources-tab'

export default async function DealSettingsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Deal Settings</h1>
                <p className="text-muted-foreground">
                    Configure monitoring and preferences
                </p>
            </div>
            <Separator />

            <Tabs defaultValue="sources" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="sources">Sources</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>

                <TabsContent value="sources" className="space-y-4">
                    <SourcesTab dealId={id} />
                </TabsContent>

                <TabsContent value="team">
                    <p className="text-muted-foreground">Team management coming soon</p>
                </TabsContent>

                <TabsContent value="general">
                    <p className="text-muted-foreground">General settings coming soon</p>
                </TabsContent>
            </Tabs>
        </div>
    )
}
