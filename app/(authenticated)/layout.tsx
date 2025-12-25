
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="w-full min-h-screen flex flex-col">
                <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b-2 border-border">
                    <div className="px-6 py-4 flex items-center gap-4">
                        <SidebarTrigger className="hover:bg-muted transition-colors" />
                        <div className="flex-1">
                            <h1 className="font-serif font-semibold text-lg tracking-tight">Deal Workspace</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground px-3 py-1.5 bg-muted rounded">
                                LIVE
                            </span>
                        </div>
                    </div>
                </header>
                <div className="flex-1 px-8 py-6">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}
