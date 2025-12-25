import { createGmailClient } from './client'
import { queueEmailProcessing } from '@/lib/queue/jobs'
import { createClient } from '@supabase/supabase-js'

/**
 * Gmail Message Monitor
 *
 * Monitors Gmail for deal-related email communications
 * From originplan.md Section 5.2: Email Awareness
 */

// Lazy initialize Supabase client to ensure env vars are loaded
let supabase: ReturnType<typeof createClient>
function getSupabase() {
    if (!supabase) {
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return supabase
}

export interface GmailMessage {
    id: string
    threadId: string
    subject: string
    from: string
    to: string[]
    date: string
    snippet: string
    body?: string
}

/**
 * List messages matching a query
 */
export async function listMessages(
    accessToken: string,
    query: string,
    maxResults: number = 50,
    refreshToken?: string
): Promise<{ id: string; threadId: string }[]> {
    const gmail = createGmailClient(accessToken, refreshToken)

    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults,
        })

        return (response.data.messages || []).filter((m): m is { id: string; threadId: string } =>
            !!m.id && !!m.threadId
        )
    } catch (error) {
        console.error('Error listing Gmail messages:', error)
        throw error
    }
}

/**
 * Get message details
 */
export async function getMessage(
    accessToken: string,
    messageId: string,
    refreshToken?: string
): Promise<GmailMessage> {
    const gmail = createGmailClient(accessToken, refreshToken)

    try {
        const response = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        })

        const message = response.data
        const headers = message.payload?.headers || []

        // Extract headers
        const getHeader = (name: string) =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

        const subject = getHeader('Subject')
        const from = getHeader('From')
        const to = getHeader('To').split(',').map((e) => e.trim())
        const date = getHeader('Date')

        // Extract body
        let body = ''
        if (message.payload?.body?.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString()
        } else if (message.payload?.parts) {
            // Multi-part message, get text/plain part
            const textPart = message.payload.parts.find(
                (part) => part.mimeType === 'text/plain'
            )
            if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString()
            }
        }

        return {
            id: message.id!,
            threadId: message.threadId!,
            subject,
            from,
            to,
            date,
            snippet: message.snippet || '',
            body,
        }
    } catch (error) {
        console.error('Error getting Gmail message:', error)
        throw error
    }
}

/**
 * Get thread messages
 */
export async function getThread(
    accessToken: string,
    threadId: string,
    refreshToken?: string
): Promise<GmailMessage[]> {
    const gmail = createGmailClient(accessToken, refreshToken)

    try {
        const response = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full',
        })

        const messages: GmailMessage[] = []

        for (const message of response.data.messages || []) {
            const headers = message.payload?.headers || []

            const getHeader = (name: string) =>
                headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

            const subject = getHeader('Subject')
            const from = getHeader('From')
            const to = getHeader('To').split(',').map((e) => e.trim())
            const date = getHeader('Date')

            let body = ''
            if (message.payload?.body?.data) {
                body = Buffer.from(message.payload.body.data, 'base64').toString()
            } else if (message.payload?.parts) {
                const textPart = message.payload.parts.find(
                    (part) => part.mimeType === 'text/plain'
                )
                if (textPart?.body?.data) {
                    body = Buffer.from(textPart.body.data, 'base64').toString()
                }
            }

            messages.push({
                id: message.id!,
                threadId: message.threadId!,
                subject,
                from,
                to,
                date,
                snippet: message.snippet || '',
                body,
            })
        }

        return messages
    } catch (error) {
        console.error('Error getting Gmail thread:', error)
        throw error
    }
}

/**
 * Sync Gmail messages with database
 */
export async function syncGmailMessages(
    dealId: string,
    searchQuery: string,
    accessToken: string,
    refreshToken?: string
) {
    console.log(`🔄 Syncing Gmail for deal ${dealId}`)
    console.log(`  📧 Query: ${searchQuery}`)

    try {
        // List messages matching query
        const messages = await listMessages(accessToken, searchQuery, 50, refreshToken)

        console.log(`  📧 Found ${messages.length} messages`)

        let newEmails = 0
        let updatedEmails = 0

        // Process each message
        for (const msgRef of messages) {
            // Get full message details
            const message = await getMessage(accessToken, msgRef.id, refreshToken)

            // Check if email exists in database
            const { data: existingEmail } = (await getSupabase()
                .from('communications')
                .select('id, updated_at')
                .eq('source_id', message.id)
                .eq('deal_id', dealId)
                .single()) as { data: any; error: any }

            if (!existingEmail) {
                // New email - create record
                const { data: newEmail, error } = (await getSupabase()
                    .from('communications')
                    .insert({
                        deal_id: dealId,
                        type: 'email',
                        subject: message.subject,
                        sender: message.from,
                        recipients: message.to,
                        body: message.body,
                        thread_id: message.threadId,
                        source_id: message.id,
                        source_type: 'gmail',
                        received_at: new Date(message.date).toISOString(),
                        status: 'new',
                    } as any)
                    .select()
                    .single()) as { data: any; error: any }

                if (!error && newEmail) {
                    newEmails++
                    // Queue for AI sentiment analysis
                    await queueEmailProcessing(newEmail.id, dealId, 'analyze_sentiment')
                    console.log(`    ✅ New: ${message.subject}`)
                }
            } else {
                // Email already exists - could check for updates
                // For now, Gmail messages don't typically change after delivery
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
        console.error('Gmail sync error:', error)
        throw error
    }
}

/**
 * Build search query for deal-related emails
 *
 * Example queries:
 * - "subject:(acquisition OR merger OR M&A) after:2024/01/01"
 * - "from:john@company.com OR to:john@company.com"
 */
export function buildDealSearchQuery(
    keywords?: string[],
    participants?: string[],
    afterDate?: Date
): string {
    const parts: string[] = []

    if (keywords && keywords.length > 0) {
        const keywordQuery = keywords.map((k) => `"${k}"`).join(' OR ')
        parts.push(`(${keywordQuery})`)
    }

    if (participants && participants.length > 0) {
        const participantQuery = participants
            .map((p) => `(from:${p} OR to:${p})`)
            .join(' OR ')
        parts.push(`(${participantQuery})`)
    }

    if (afterDate) {
        const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/')
        parts.push(`after:${dateStr}`)
    }

    return parts.join(' ')
}
