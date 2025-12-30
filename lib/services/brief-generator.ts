import { createServiceClient } from '@/lib/supabase/service'
import { detectBlockerInThread } from '@/lib/ai/email-intelligence'

/**
 * Daily Brief Generator Service
 *
 * Core product feature from originplan.md Section 5.5
 * Generates executive-ready daily briefs answering:
 * "What changed since yesterday, what's blocked, and what could hurt us?"
 */

interface BriefData {
    progress_snapshot: {
        overall: number
        workstreams: Record<string, number>
        change_vs_previous?: number
    }
    changes: {
        new_documents: string[]
        updated_documents: string[]
        reviewed_count: number
    }
    blockers: {
        items: Array<{
            title: string
            workstream: string
            age_days: number
            owner?: string
        }>
    }
    risks: {
        items: Array<{
            title: string
            severity: 'low' | 'medium' | 'high'
            source: string
            citation?: string
        }>
    }
    communications: {
        notable: Array<{
            subject: string
            sender: string
            snippet: string
            reason: string
        }>
    }
}

/**
 * Generate daily brief for a deal
 */
export async function generateDailyBrief(dealId: string): Promise<BriefData> {
    const supabase = createServiceClient()

    // Fetch all data in parallel
    const [documents, emails, workstreams, previousBrief] = await Promise.all([
        getDocuments(dealId),
        getEmails(dealId),
        getWorkstreams(dealId),
        getPreviousBrief(dealId),
    ])

    // 1. Calculate Progress Snapshot
    const progressSnapshot = calculateProgress(documents, workstreams, previousBrief)

    // 2. Detect Changes (since yesterday)
    const changes = detectChanges(documents)

    // 3. Identify Blockers
    const blockers = await identifyBlockers(emails, documents)

    // 4. Extract Risks
    const risks = extractRisks(documents)

    // 5. Find Notable Communications
    const communications = identifyNotableCommunications(emails)

    return {
        progress_snapshot: progressSnapshot,
        changes,
        blockers,
        risks,
        communications,
    }
}

/**
 * Save generated brief to database
 */
export async function saveBrief(dealId: string, briefData: BriefData) {
    const supabase = createServiceClient()

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('briefs')
        .upsert({
            deal_id: dealId,
            brief_date: today,
            ...briefData,
            status: 'published',
            published_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (error) {
        console.error('Error saving brief:', error)
        throw new Error('Failed to save daily brief')
    }

    return data
}

// Helper functions

async function getDocuments(dealId: string) {
    const supabase = createServiceClient()
    const { data } = await supabase
        .from('documents')
        .select('*, workstreams(*)')
        .eq('deal_id', dealId)
    return data || []
}

async function getEmails(dealId: string) {
    const supabase = createServiceClient()
    const { data } = await supabase
        .from('emails')
        .select('*')
        .eq('deal_id', dealId)
        .order('received_at', { ascending: false })
    return data || []
}

async function getWorkstreams(dealId: string) {
    const supabase = createServiceClient()
    const { data } = await supabase
        .from('workstreams')
        .select('*')
        .eq('deal_id', dealId)
    return data || []
}

async function getPreviousBrief(dealId: string) {
    const supabase = createServiceClient()
    const { data } = await supabase
        .from('briefs')
        .select('*')
        .eq('deal_id', dealId)
        .order('brief_date', { ascending: false })
        .limit(1)
        .single()
    return data || null
}

/**
 * Calculate overall and workstream-level progress
 */
function calculateProgress(
    documents: any[],
    workstreams: any[],
    previousBrief: any
) {
    // Simple heuristic: progress = (reviewed docs / total docs) * 100
    const totalDocs = documents.length
    const reviewedDocs = documents.filter(d => d.status === 'reviewed').length
    const overall = totalDocs > 0 ? Math.round((reviewedDocs / totalDocs) * 100) : 0

    // Calculate per workstream
    const workstreamProgress: Record<string, number> = {}
    for (const ws of workstreams) {
        const wsDocs = documents.filter(d => d.workstream_id === ws.id)
        const wsReviewed = wsDocs.filter(d => d.status === 'reviewed').length
        workstreamProgress[ws.name] = wsDocs.length > 0
            ? Math.round((wsReviewed / wsDocs.length) * 100)
            : 0
    }

    // Calculate change vs previous
    let changeVsPrevious = 0
    if (previousBrief?.progress_snapshot?.overall) {
        changeVsPrevious = overall - previousBrief.progress_snapshot.overall
    }

    return {
        overall,
        workstreams: workstreamProgress,
        change_vs_previous: changeVsPrevious,
    }
}

/**
 * Detect document changes since yesterday
 */
function detectChanges(documents: any[]) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const newDocs = documents.filter(d =>
        d.status === 'new' && new Date(d.created_at) >= yesterday
    )
    const updatedDocs = documents.filter(d =>
        d.status === 'updated' && new Date(d.updated_at) >= yesterday
    )
    const reviewedCount = documents.filter(d => d.status === 'reviewed').length

    return {
        new_documents: newDocs.map(d => d.name),
        updated_documents: updatedDocs.map(d => d.name),
        reviewed_count: reviewedCount,
    }
}

/**
 * Identify blockers from emails and stalled documents
 */
async function identifyBlockers(emails: any[], documents: any[]) {
    const blockers: Array<{
        title: string
        workstream: string
        age_days: number
        owner?: string
    }> = []

    // Find emails marked as blockers
    const blockerEmails = emails.filter(e => e.is_blocker || e.sentiment === 'risk')
    for (const email of blockerEmails.slice(0, 5)) {
        const ageDays = Math.floor(
            (Date.now() - new Date(email.received_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        blockers.push({
            title: email.subject,
            workstream: 'General',
            age_days: ageDays,
            owner: email.sender,
        })
    }

    // Find stalled documents (not updated in 7+ days with status 'new' or 'updated')
    const stalledDocs = documents.filter(d => {
        if (d.status === 'reviewed') return false
        const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSinceUpdate >= 7
    })

    for (const doc of stalledDocs.slice(0, 3)) {
        const ageDays = Math.floor(
            (Date.now() - new Date(doc.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        blockers.push({
            title: `Document pending review: ${doc.name}`,
            workstream: doc.workstreams?.name || 'General',
            age_days: ageDays,
        })
    }

    return { items: blockers }
}

/**
 * Extract risks from documents
 */
function extractRisks(documents: any[]) {
    const risks: Array<{
        title: string
        severity: 'low' | 'medium' | 'high'
        source: string
        citation?: string
    }> = []

    // This would normally use AI risk detection
    // For now, we'll use a simple heuristic
    const newImportantDocs = documents.filter(d =>
        d.status === 'new' &&
        (d.name.toLowerCase().includes('legal') ||
            d.name.toLowerCase().includes('compliance') ||
            d.name.toLowerCase().includes('liability'))
    )

    for (const doc of newImportantDocs.slice(0, 3)) {
        risks.push({
            title: `New ${doc.workstreams?.name || 'document'} requires review`,
            severity: 'medium',
            source: doc.name,
        })
    }

    return { items: risks }
}

/**
 * Identify notable communications
 */
function identifyNotableCommunications(emails: any[]) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    // Get recent emails with important keywords
    const notableEmails = emails
        .filter(e => new Date(e.received_at) >= yesterday)
        .filter(e =>
            e.subject?.toLowerCase().includes('approval') ||
            e.subject?.toLowerCase().includes('deadline') ||
            e.subject?.toLowerCase().includes('urgent') ||
            e.subject?.toLowerCase().includes('review') ||
            e.sentiment === 'risk' ||
            e.sentiment === 'blocker'
        )
        .slice(0, 5)

    return {
        notable: notableEmails.map(e => ({
            subject: e.subject,
            sender: e.sender,
            snippet: e.snippet || '',
            reason: e.is_blocker ? 'Blocker' : e.sentiment === 'risk' ? 'Risk' : 'Important',
        })),
    }
}
