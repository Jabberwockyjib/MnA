import { createGraphClient, getValidAccessToken } from './client'
import { queueEmailProcessing } from '@/lib/queue/jobs'
import { createClient } from '@supabase/supabase-js'

/**
 * Outlook Message Monitor
 *
 * Monitors Outlook for deal-related email communications
 * From originplan.md Section 5.2: Email Awareness
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface OutlookMessage {
    id: string
    conversationId: string
    subject: string
    from: string
    toRecipients: string[]
    receivedDateTime: string
    bodyPreview: string
    body?: string
}

/**
 * List messages with optional filter
 */
export async function listMessages(
    accessToken: string,
    filter?: string,
    maxResults: number = 50
): Promise<OutlookMessage[]> {
    const graphClient = createGraphClient(accessToken)

    try {
        let request = graphClient
            .api('/me/messages')
            .top(maxResults)
            .orderby('receivedDateTime DESC')

        if (filter) {
            request = request.filter(filter)
        }

        const response = await request.get()

        return (response.value || []).map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            subject: msg.subject || '',
            from: msg.from?.emailAddress?.address || '',
            toRecipients: msg.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
            receivedDateTime: msg.receivedDateTime,
            bodyPreview: msg.bodyPreview || '',
            body: msg.body?.content,
        }))
    } catch (error) {
        console.error('Error listing Outlook messages:', error)
        throw error
    }
}

/**
 * Get message details
 */
export async function getMessage(
    accessToken: string,
    messageId: string
): Promise<OutlookMessage> {
    const graphClient = createGraphClient(accessToken)

    try {
        const msg = await graphClient.api(`/me/messages/${messageId}`).get()

        return {
            id: msg.id,
            conversationId: msg.conversationId,
            subject: msg.subject || '',
            from: msg.from?.emailAddress?.address || '',
            toRecipients: msg.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
            receivedDateTime: msg.receivedDateTime,
            bodyPreview: msg.bodyPreview || '',
            body: msg.body?.content,
        }
    } catch (error) {
        console.error('Error getting Outlook message:', error)
        throw error
    }
}

/**
 * Search messages
 */
export async function searchMessages(
    accessToken: string,
    query: string,
    maxResults: number = 50
): Promise<OutlookMessage[]> {
    const graphClient = createGraphClient(accessToken)

    try {
        const response = await graphClient
            .api('/me/messages')
            .search(`"${query}"`)
            .top(maxResults)
            .orderby('receivedDateTime DESC')
            .get()

        return (response.value || []).map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            subject: msg.subject || '',
            from: msg.from?.emailAddress?.address || '',
            toRecipients: msg.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
            receivedDateTime: msg.receivedDateTime,
            bodyPreview: msg.bodyPreview || '',
            body: msg.body?.content,
        }))
    } catch (error) {
        console.error('Error searching Outlook messages:', error)
        throw error
    }
}

/**
 * Sync Outlook messages with database
 */
export async function syncOutlookMessages(
    dealId: string,
    searchQuery: string | null,
    filterQuery: string | null,
    accessToken: string,
    refreshToken: string | null,
    tokenExpiresAt: string | null
) {
    console.log(`🔄 Syncing Outlook for deal ${dealId}`)

    try {
        // Get valid access token (refresh if needed)
        const validToken = await getValidAccessToken(
            accessToken,
            refreshToken,
            tokenExpiresAt
        )

        // Fetch messages using search or filter
        let messages: OutlookMessage[]

        if (searchQuery) {
            console.log(`  📧 Search: ${searchQuery}`)
            messages = await searchMessages(validToken, searchQuery, 50)
        } else if (filterQuery) {
            console.log(`  📧 Filter: ${filterQuery}`)
            messages = await listMessages(validToken, filterQuery, 50)
        } else {
            console.log(`  📧 Fetching recent messages`)
            // Default: messages from last 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            const filter = `receivedDateTime ge ${thirtyDaysAgo.toISOString()}`
            messages = await listMessages(validToken, filter, 50)
        }

        console.log(`  📧 Found ${messages.length} messages`)

        let newEmails = 0
        let updatedEmails = 0

        // Process each message
        for (const message of messages) {
            // Check if email exists in database
            const { data: existingEmail } = await supabase
                .from('communications')
                .select('id, updated_at')
                .eq('source_id', message.id)
                .eq('deal_id', dealId)
                .single()

            if (!existingEmail) {
                // New email - create record
                const { data: newEmail, error } = await supabase
                    .from('communications')
                    .insert({
                        deal_id: dealId,
                        type: 'email',
                        subject: message.subject,
                        sender: message.from,
                        recipients: message.toRecipients,
                        body: message.body,
                        thread_id: message.conversationId,
                        source_id: message.id,
                        source_type: 'outlook',
                        received_at: new Date(message.receivedDateTime).toISOString(),
                        status: 'new',
                    })
                    .select()
                    .single()

                if (!error && newEmail) {
                    newEmails++
                    // Queue for AI sentiment analysis
                    await queueEmailProcessing(newEmail.id, dealId, 'analyze_sentiment')
                    console.log(`    ✅ New: ${message.subject}`)
                }
            } else {
                // Email already exists - Outlook messages don't typically change
                // So we just skip
            }
        }

        console.log(`  ✅ Sync complete: ${newEmails} new emails`)

        return {
            success: true,
            messagesScanned: messages.length,
            newEmails,
            updatedEmails,
        }
    } catch (error) {
        console.error('Outlook sync error:', error)
        throw error
    }
}

/**
 * Build OData filter query for deal-related emails
 *
 * Example filters:
 * - "receivedDateTime ge 2024-01-01T00:00:00Z"
 * - "from/emailAddress/address eq 'john@company.com'"
 * - "contains(subject, 'acquisition')"
 */
export function buildDealFilterQuery(
    participants?: string[],
    afterDate?: Date
): string | null {
    const parts: string[] = []

    if (participants && participants.length > 0) {
        const participantFilters = participants.map(
            (p) => `from/emailAddress/address eq '${p}'`
        )
        parts.push(`(${participantFilters.join(' or ')})`)
    }

    if (afterDate) {
        parts.push(`receivedDateTime ge ${afterDate.toISOString()}`)
    }

    return parts.length > 0 ? parts.join(' and ') : null
}
