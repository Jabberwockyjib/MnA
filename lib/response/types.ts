
export type Deal = {
    id: string
    name: string
    status: 'active' | 'closed' | 'paused'
    created_at: string
    updated_at: string
}

export type Workstream = {
    id: string
    deal_id: string
    name: string
    description: string | null
    status: string
    created_at: string
}

export type DealMember = {
    id: string
    deal_id: string
    user_id: string
    role: 'admin' | 'member' | 'viewer'
    created_at: string
}
