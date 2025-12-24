import { createGraphClient, getValidAccessToken } from './client'
import { queueDocumentProcessing } from '@/lib/queue/jobs'
import { createClient } from '@supabase/supabase-js'

/**
 * SharePoint File Monitor
 *
 * Monitors SharePoint sites/folders for new/updated documents
 * From originplan.md Section 5.2
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SharePointFile {
    id: string
    name: string
    webUrl: string
    lastModifiedDateTime: string
    size?: number
    mimeType?: string
}

/**
 * List files in a SharePoint site/drive
 */
export async function listFilesInSite(
    accessToken: string,
    siteId: string,
    driveId?: string
): Promise<SharePointFile[]> {
    const graphClient = createGraphClient(accessToken)

    try {
        let endpoint = `/sites/${siteId}`

        // If driveId is provided, list that specific drive, otherwise use default drive
        if (driveId) {
            endpoint += `/drives/${driveId}/root/children`
        } else {
            endpoint += `/drive/root/children`
        }

        const response = await graphClient.api(endpoint).get()

        return (response.value || []).map((file: any) => ({
            id: file.id,
            name: file.name,
            webUrl: file.webUrl,
            lastModifiedDateTime: file.lastModifiedDateTime,
            size: file.size,
            mimeType: file.file?.mimeType,
        }))
    } catch (error) {
        console.error('Error listing SharePoint files:', error)
        throw error
    }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
    accessToken: string,
    siteId: string,
    fileId: string,
    driveId?: string
) {
    const graphClient = createGraphClient(accessToken)

    try {
        let endpoint = `/sites/${siteId}`

        if (driveId) {
            endpoint += `/drives/${driveId}/items/${fileId}`
        } else {
            endpoint += `/drive/items/${fileId}`
        }

        return await graphClient.api(endpoint).get()
    } catch (error) {
        console.error('Error getting file metadata:', error)
        throw error
    }
}

/**
 * Download file content
 */
export async function downloadFileContent(
    accessToken: string,
    siteId: string,
    fileId: string,
    driveId?: string
): Promise<string> {
    const graphClient = createGraphClient(accessToken)

    try {
        let endpoint = `/sites/${siteId}`

        if (driveId) {
            endpoint += `/drives/${driveId}/items/${fileId}/content`
        } else {
            endpoint += `/drive/items/${fileId}/content`
        }

        const content = await graphClient.api(endpoint).get()

        // Convert to string if needed
        if (typeof content === 'string') {
            return content
        }

        return JSON.stringify(content)
    } catch (error) {
        console.error('Error downloading file content:', error)
        throw error
    }
}

/**
 * Sync SharePoint site with database
 */
export async function syncSharePointSite(
    dealId: string,
    siteId: string,
    accessToken: string,
    refreshToken: string | null,
    tokenExpiresAt: string | null,
    driveId?: string
) {
    console.log(`🔄 Syncing SharePoint site ${siteId} for deal ${dealId}`)

    try {
        // Get valid access token (refresh if needed)
        const validToken = await getValidAccessToken(
            accessToken,
            refreshToken,
            tokenExpiresAt
        )

        // List files in site
        const files = await listFilesInSite(validToken, siteId, driveId)

        console.log(`  📁 Found ${files.length} files`)

        let newDocs = 0
        let updatedDocs = 0

        for (const file of files) {
            // Skip folders (files without mimeType or size)
            if (!file.mimeType && !file.size) {
                continue
            }

            // Check if document exists in database
            const { data: existingDoc } = await supabase
                .from('documents')
                .select('id, updated_at')
                .eq('source_id', file.id)
                .eq('deal_id', dealId)
                .single()

            if (!existingDoc) {
                // New document - create record
                const { data: newDoc, error } = await supabase
                    .from('documents')
                    .insert({
                        deal_id: dealId,
                        name: file.name,
                        source_id: file.id,
                        source_url: file.webUrl,
                        source_type: 'sharepoint',
                        status: 'new',
                        last_ingested_at: new Date().toISOString(),
                    })
                    .select()
                    .single()

                if (!error && newDoc) {
                    newDocs++
                    // Queue for AI processing
                    await queueDocumentProcessing(newDoc.id, dealId, 'summarize')
                    console.log(`    ✅ New: ${file.name}`)
                }
            } else {
                // Check if modified
                const spModified = new Date(file.lastModifiedDateTime)
                const dbModified = new Date(existingDoc.updated_at)

                if (spModified > dbModified) {
                    // Document updated
                    await supabase
                        .from('documents')
                        .update({
                            status: 'updated',
                            updated_at: new Date().toISOString(),
                            last_ingested_at: new Date().toISOString(),
                        })
                        .eq('id', existingDoc.id)

                    updatedDocs++
                    // Queue for re-processing
                    await queueDocumentProcessing(existingDoc.id, dealId, 'summarize')
                    console.log(`    🔄 Updated: ${file.name}`)
                }
            }
        }

        console.log(`  ✅ Sync complete: ${newDocs} new, ${updatedDocs} updated`)

        return {
            success: true,
            filesScanned: files.length,
            newDocuments: newDocs,
            updatedDocuments: updatedDocs,
        }
    } catch (error) {
        console.error('SharePoint sync error:', error)
        throw error
    }
}

/**
 * Get SharePoint site by URL
 */
export async function getSiteByUrl(accessToken: string, siteUrl: string) {
    const graphClient = createGraphClient(accessToken)

    try {
        // Extract hostname and site path from URL
        const url = new URL(siteUrl)
        const hostname = url.hostname
        const sitePath = url.pathname

        const response = await graphClient
            .api(`/sites/${hostname}:${sitePath}`)
            .get()

        return {
            siteId: response.id,
            displayName: response.displayName,
            webUrl: response.webUrl,
        }
    } catch (error) {
        console.error('Error getting SharePoint site:', error)
        throw error
    }
}
