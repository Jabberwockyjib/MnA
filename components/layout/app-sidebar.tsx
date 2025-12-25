'use client'

import { Home, Inbox, Settings, FileText, Users, Activity } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
    },
    {
        title: "Documents",
        url: "/documents",
        icon: FileText,
    },
    {
        title: "Team",
        url: "/team",
        icon: Users,
    },
    {
        title: "Communications",
        url: "/communications",
        icon: Inbox,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
]

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export function AppSidebar() {
    const [workstreams, setWorkstreams] = useState<any[]>([])
    const [activeDeal, setActiveDeal] = useState<any>(null)
    const params = useParams()
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            // In 'No Auth' mode, we just fetch the most recent deal
            const { data: deals } = await supabase
                .from('deals')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)

            if (deals?.[0]) {
                setActiveDeal(deals[0])
                const { data: ws } = await supabase
                    .from('workstreams')
                    .select('*')
                    .eq('deal_id', deals[0].id)
                    .order('name', { ascending: true })
                setWorkstreams(ws || [])
            }
        }
        fetchData()
    }, [])

    return (
        <Sidebar className="border-r-2 border-border">
            <SidebarContent className="gap-0">
                {/* Header */}
                <div className="px-6 py-6 border-b-2 border-primary/20">
                    <div className="space-y-1">
                        <h2 className="text-xl font-serif font-bold tracking-tight text-foreground">
                            DealPulse
                        </h2>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            Intelligence Platform
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <SidebarGroup className="px-3 py-4">
                    <SidebarGroupLabel className="px-3 mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {items.map((item, index) => (
                                <SidebarMenuItem key={item.title} style={{ animationDelay: `${index * 50}ms` }}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={params.pathname === item.url}
                                        className="hover:bg-sidebar-accent transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:text-foreground"
                                    >
                                        <a href={item.url} className="flex items-center gap-3 px-3 py-2">
                                            <item.icon className="h-4 w-4" />
                                            <span className="font-medium text-sm">{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <Separator className="my-2" />

                {/* Workstreams */}
                {activeDeal && (
                    <SidebarGroup className="px-3 py-4">
                        <SidebarGroupLabel className="px-3 mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            Workstreams
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {workstreams.length > 0 ? (
                                    workstreams.map((ws, index) => (
                                        <SidebarMenuItem key={ws.id} style={{ animationDelay: `${(items.length + index) * 50}ms` }}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={params.ws_id === ws.id}
                                                className="hover:bg-sidebar-accent transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:border-l-2 data-[active=true]:border-primary"
                                            >
                                                <a href={`/deals/${activeDeal.id}/workstreams/${ws.id}`} className="flex items-center gap-3 px-3 py-2">
                                                    <div className="h-2 w-2 rounded-full bg-primary/50" />
                                                    <span className="font-medium text-sm">{ws.name}</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                        No workstreams yet
                                    </div>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="border-t-2 border-border">
                <div className="p-4">
                    <div className="flex items-center gap-3 px-2 py-2 rounded hover:bg-sidebar-accent transition-colors cursor-pointer">
                        <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                DU
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">Dev User</div>
                            <div className="text-xs text-muted-foreground font-mono">Administrator</div>
                        </div>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

