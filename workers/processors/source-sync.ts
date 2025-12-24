import { Job } from 'bullmq'
import { SourceSyncJobData } from '@/lib/queue/jobs'
import { syncDriveFolder } from '@/lib/integrations/google-drive/monitor'
import { syncSharePointSite } from '@/lib/integrations/sharepoint/monitor'
import { syncGmailMessages, buildDealSearchQuery } from '@/lib/integrations/gmail/monitor'
import { syncOutlookMessages, buildDealFilterQuery } from '@/lib/integrations/outlook/monitor'
import { createClient } from '@supabase/supabase-js'

/**
 * Source Sync Worker
 *
 * Handles syncing from external sources
 * From originplan.md Section 5.2: Source Monitoring
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function processSourceSync(job: Job<SourceSyncJobData>) {
    const { dealId, sourceType, syncType } = job.data

    console.log(`🔄 Syncing ${sourceType} for deal ${dealId} (${syncType})`)

    try {
        await job.updateProgress(10)

        let result
        switch (sourceType) {
            case 'gdrive':
                result = await syncGoogleDrive(dealId, syncType)
                break
            case 'sharepoint':
                result = await syncSharePoint(dealId, syncType)
                break
            case 'gmail':
                result = await syncGmail(dealId, syncType)
                break
            case 'outlook':
                result = await syncOutlook(dealId, syncType)
                break
        }

        await job.updateProgress(100)

        console.log(`✅ ${sourceType} sync completed for deal ${dealId}`)

        return {
            success: true,
            dealId,
            sourceType,
            syncType,
            ...result,
        }
    } catch (error) {
        console.error(`❌ Source sync failed for ${sourceType}:`, error)
        throw error
    }
}

async function syncGoogleDrive(dealId: string, syncType: string) {
    console.log(`  📁 Syncing Google Drive (${syncType})`)

    // Get source connection
    const { data: connection } = await supabase
        .from('source_connections')
        .select('*')
        .eq('deal_id', dealId)
        .eq('source_type', 'gdrive')
        .eq('is_active', true)
        .single()

    if (!connection) {
        console.log('  ⚠️ No active Google Drive connection found')
        return { synced: 0 }
    }

    if (!connection.folder_id) {
        console.log('  ⚠️ No folder ID configured')
        return { synced: 0 }
    }

    // Sync the folder
    const result = await syncDriveFolder(
        dealId,
        connection.folder_id,
        connection.access_token,
        connection.refresh_token || undefined
    )

    return {
        synced: result.newDocuments + result.updatedDocuments,
        newDocuments: result.newDocuments,
        updatedDocuments: result.updatedDocuments,
        filesScanned: result.filesScanned,
    }
}

async function syncSharePoint(dealId: string, syncType: string) {
    console.log(`  📁 Syncing SharePoint (${syncType})`)

    // Get source connection
    const { data: connection } = await supabase
        .from('source_connections')
        .select('*')
        .eq('deal_id', dealId)
        .eq('source_type', 'sharepoint')
        .eq('is_active', true)
        .single()

    if (!connection) {
        console.log('  ⚠️ No active SharePoint connection found')
        return { synced: 0 }
    }

    if (!connection.folder_id) {
        console.log('  ⚠️ No site ID configured')
        return { synced: 0 }
    }

    // Get drive ID from configuration if available
    const driveId = connection.configuration?.driveId as string | undefined

    // Sync the SharePoint site
    const result = await syncSharePointSite(
        dealId,
        connection.folder_id, // folder_id stores the site ID for SharePoint
        connection.access_token,
        connection.refresh_token || null,
        connection.token_expires_at,
        driveId
    )

    return {
        synced: result.newDocuments + result.updatedDocuments,
        newDocuments: result.newDocuments,
        updatedDocuments: result.updatedDocuments,
        filesScanned: result.filesScanned,
    }
}

async function syncGmail(dealId: string, syncType: string) {
    console.log(`  ✉️ Syncing Gmail (${syncType})`)

    // Get source connection
    const { data: connection } = await supabase
        .from('source_connections')
        .select('*')
        .eq('deal_id', dealId)
        .eq('source_type', 'gmail')
        .eq('is_active', true)
        .single()

    if (!connection) {
        console.log('  ⚠️ No active Gmail connection found')
        return { synced: 0 }
    }

    // Get search configuration from connection
    const config = connection.configuration || {}
    const keywords = config.keywords as string[] | undefined
    const participants = config.participants as string[] | undefined
    const afterDate = config.afterDate
        ? new Date(config.afterDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days

    // Build search query
    const searchQuery = buildDealSearchQuery(keywords, participants, afterDate)

    // Sync Gmail messages
    const result = await syncGmailMessages(
        dealId,
        searchQuery,
        connection.access_token,
        connection.refresh_token || undefined
    )

    return {
        synced: result.newEmails,
        newEmails: result.newEmails,
        updatedEmails: result.updatedEmails,
        messagesScanned: result.messagesScanned,
    }
}

async function syncOutlook(dealId: string, syncType: string) {
    console.log(`  ✉️ Syncing Outlook (${syncType})`)

    // Get source connection
    const { data: connection } = await supabase
        .from('source_connections')
        .select('*')
        .eq('deal_id', dealId)
        .eq('source_type', 'outlook')
        .eq('is_active', true)
        .single()

    if (!connection) {
        console.log('  ⚠️ No active Outlook connection found')
        return { synced: 0 }
    }

    // Get search configuration from connection
    const config = connection.configuration || {}
    const searchQuery = config.searchQuery as string | null
    const participants = config.participants as string[] | undefined
    const afterDate = config.afterDate
        ? new Date(config.afterDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days

    // Build filter query if no search query provided
    const filterQuery = searchQuery
        ? null
        : buildDealFilterQuery(participants, afterDate)

    // Sync Outlook messages
    const result = await syncOutlookMessages(
        dealId,
        searchQuery,
        filterQuery,
        connection.access_token,
        connection.refresh_token || null,
        connection.token_expires_at
    )

    return {
        synced: result.newEmails,
        newEmails: result.newEmails,
        updatedEmails: result.updatedEmails,
        messagesScanned: result.messagesScanned,
    }
}
