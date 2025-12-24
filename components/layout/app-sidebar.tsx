'use client'

import { Calendar, Home, Inbox, Search, Settings, FileText, Users } from "lucide-react"

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
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-lg font-bold text-primary">DealPulse</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={params.pathname === item.url}>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {activeDeal && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Workstreams</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {workstreams.map((ws) => (
                                    <SidebarMenuItem key={ws.id}>
                                        <SidebarMenuButton asChild isActive={params.ws_id === ws.id}>
                                            <a href={`/deals/${activeDeal.id}/workstreams/${ws.id}`}>
                                                <FileText className="h-4 w-4" />
                                                <span>{ws.name}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter>
                <div className="p-4">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="text-sm font-medium">Dev User</div>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

