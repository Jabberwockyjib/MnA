import {
    dailyBriefQueue,
    documentProcessingQueue,
    emailProcessingQueue,
    sourceSyncQueue,
} from './connection'

/**
 * Job Queue Interface
 *
 * Add jobs to queues for background processing
 */

// Job Data Types
export interface DailyBriefJobData {
    dealId: string
    date: string
}

export interface DocumentProcessingJobData {
    documentId: string
    dealId: string
    operation: 'summarize' | 'extract_risks' | 'classify'
}

export interface EmailProcessingJobData {
    emailId: string
    dealId: string
    operation: 'analyze_sentiment' | 'detect_blocker'
}

export interface SourceSyncJobData {
    dealId: string
    sourceType: 'gdrive' | 'sharepoint' | 'gmail' | 'outlook'
    syncType: 'full' | 'incremental'
}

/**
 * Queue a daily brief generation job
 */
export async function queueDailyBrief(dealId: string, date?: string) {
    const jobData: DailyBriefJobData = {
        dealId,
        date: date || new Date().toISOString().split('T')[0],
    }

    const job = await dailyBriefQueue.add('generate-brief', jobData, {
        jobId: `brief-${dealId}-${jobData.date}`, // Prevent duplicates
    })

    console.log(`📋 Queued daily brief for deal ${dealId}: Job ${job.id}`)
    return job
}

/**
 * Queue document processing job
 */
export async function queueDocumentProcessing(
    documentId: string,
    dealId: string,
    operation: DocumentProcessingJobData['operation']
) {
    const jobData: DocumentProcessingJobData = {
        documentId,
        dealId,
        operation,
    }

    const job = await documentProcessingQueue.add(`doc-${operation}`, jobData)

    console.log(`📄 Queued document ${operation} for ${documentId}: Job ${job.id}`)
    return job
}

/**
 * Queue email processing job
 */
export async function queueEmailProcessing(
    emailId: string,
    dealId: string,
    operation: EmailProcessingJobData['operation']
) {
    const jobData: EmailProcessingJobData = {
        emailId,
        dealId,
        operation,
    }

    const job = await emailProcessingQueue.add(`email-${operation}`, jobData)

    console.log(`✉️ Queued email ${operation} for ${emailId}: Job ${job.id}`)
    return job
}

/**
 * Queue source sync job
 */
export async function queueSourceSync(
    dealId: string,
    sourceType: SourceSyncJobData['sourceType'],
    syncType: SourceSyncJobData['syncType'] = 'incremental'
) {
    const jobData: SourceSyncJobData = {
        dealId,
        sourceType,
        syncType,
    }

    const job = await sourceSyncQueue.add(`sync-${sourceType}`, jobData, {
        jobId: `sync-${dealId}-${sourceType}-${Date.now()}`,
    })

    console.log(`🔄 Queued ${sourceType} sync for deal ${dealId}: Job ${job.id}`)
    return job
}

/**
 * Queue daily briefs for all active deals
 */
export async function queueAllDailyBriefs() {
    // This would fetch all active deals and queue briefs
    // For now, it's a placeholder
    console.log('📋 Queueing daily briefs for all active deals')

    // In production:
    // const deals = await getActiveDeals()
    // for (const deal of deals) {
    //     await queueDailyBrief(deal.id)
    // }

    return { queued: 0 }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const [
        dailyBriefCounts,
        documentCounts,
        emailCounts,
        sourceCounts,
    ] = await Promise.all([
        dailyBriefQueue.getJobCounts(),
        documentProcessingQueue.getJobCounts(),
        emailProcessingQueue.getJobCounts(),
        sourceSyncQueue.getJobCounts(),
    ])

    return {
        dailyBrief: dailyBriefCounts,
        documentProcessing: documentCounts,
        emailProcessing: emailCounts,
        sourceSync: sourceCounts,
    }
}
