import { createDriveClient } from './client'
import { queueDocumentProcessing } from '@/lib/queue/jobs'
import { createClient } from '@supabase/supabase-js'

/**
 * Google Drive File Monitor
 *
 * Monitors folders for new/updated documents
 * From originplan.md Section 5.2
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

export interface DriveFile {
    id: string
    name: string
    mimeType: string
    modifiedTime: string
    webViewLink: string
    size?: string
}

/**
 * List files in a Google Drive folder
 */
export async function listFilesInFolder(
    accessToken: string,
    folderId: string,
    refreshToken?: string
): Promise<DriveFile[]> {
    const drive = createDriveClient(accessToken, refreshToken)

    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size)',
            orderBy: 'modifiedTime desc',
            pageSize: 100,
        })

        return (response.data.files || []) as DriveFile[]
    } catch (error) {
        console.error('Error listing Drive files:', error)
        throw error
    }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
    accessToken: string,
    fileId: string,
    refreshToken?: string
) {
    const drive = createDriveClient(accessToken, refreshToken)

    try {
        const response = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, modifiedTime, webViewLink, size, parents',
        })

        return response.data
    } catch (error) {
        console.error('Error getting file metadata:', error)
        throw error
    }
}

/**
 * Download file content (for text-based documents)
 */
export async function downloadFileContent(
    accessToken: string,
    fileId: string,
    refreshToken?: string
): Promise<string> {
    const drive = createDriveClient(accessToken, refreshToken)

    try {
        // For Google Docs, Sheets, Slides - export as text/PDF
        const file = await drive.files.get({
            fileId,
            fields: 'mimeType',
        })

        const mimeType = file.data.mimeType

        // Handle Google Workspace files (export required)
        if (mimeType?.startsWith('application/vnd.google-apps')) {
            const exportMimeType = getExportMimeType(mimeType)
            const response = await drive.files.export(
                {
                    fileId,
                    mimeType: exportMimeType,
                },
                { responseType: 'text' }
            )
            return response.data as string
        }

        // Handle regular files
        const response = await drive.files.get(
            {
                fileId,
                alt: 'media',
            },
            { responseType: 'text' }
        )

        return response.data as string
    } catch (error) {
        console.error('Error downloading file content:', error)
        throw error
    }
}

/**
 * Sync Google Drive folder with database
 */
export async function syncDriveFolder(
    dealId: string,
    folderId: string,
    accessToken: string,
    refreshToken?: string
) {
    console.log(`🔄 Syncing Google Drive folder ${folderId} for deal ${dealId}`)

    try {
        // List files in folder
        const files = await listFilesInFolder(accessToken, folderId, refreshToken)

        console.log(`  📁 Found ${files.length} files`)

        let newDocs = 0
        let updatedDocs = 0

        for (const file of files) {
            // Skip folders and non-document files
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                continue
            }

            // Check if document exists in database
            const { data: existingDoc } = (await getSupabase()
                .from('documents')
                .select('id, updated_at')
                .eq('source_id', file.id)
                .eq('deal_id', dealId)
                .single()) as { data: any; error: any }

            if (!existingDoc) {
                // New document - create record
                const { data: newDoc, error } = (await getSupabase()
                    .from('documents')
                    .insert({
                        deal_id: dealId,
                        name: file.name,
                        source_id: file.id,
                        source_url: file.webViewLink,
                        source_type: 'gdrive',
                        status: 'new',
                        last_ingested_at: new Date().toISOString(),
                    } as any)
                    .select()
                    .single()) as { data: any; error: any }

                if (!error && newDoc) {
                    newDocs++
                    // Queue for AI processing
                    await queueDocumentProcessing(newDoc.id, dealId, 'summarize')
                    console.log(`    ✅ New: ${file.name}`)
                }
            } else {
                // Check if modified
                const driveModified = new Date(file.modifiedTime)
                const dbModified = new Date(existingDoc.updated_at)

                if (driveModified > dbModified) {
                    // Document updated
                    // @ts-expect-error - Supabase types not generated for documents table
                    await getSupabase()
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
        console.error('Drive sync error:', error)
        throw error
    }
}

/**
 * Get appropriate export MIME type for Google Workspace files
 */
function getExportMimeType(googleMimeType: string): string {
    const exportMap: Record<string, string> = {
        'application/vnd.google-apps.document': 'text/plain',
        'application/vnd.google-apps.spreadsheet': 'text/csv',
        'application/vnd.google-apps.presentation': 'text/plain',
    }

    return exportMap[googleMimeType] || 'text/plain'
}
