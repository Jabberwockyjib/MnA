import { Worker } from 'bullmq'
import {
    redisConnection,
    QUEUE_NAMES,
    closeQueues,
} from '../lib/queue/connection'
import { processDailyBrief } from './processors/daily-brief'
import { processDocument } from './processors/document-processing'
import { processEmail } from './processors/email-processing'
import { processSourceSync } from './processors/source-sync'
import { scheduleDailyBriefs } from './schedulers/daily-brief-cron'

/**
 * Background Worker Process
 *
 * From originplan.md Section 4.4:
 * - Redis queue-based workers (separate container)
 * - All heavy work is asynchronous:
 *   - Document ingestion
 *   - OCR
 *   - Email parsing
 *   - Daily brief generation
 */

console.log('🚀 Starting DealPulse Workers...')

// Start the daily brief scheduler
scheduleDailyBriefs()

// Daily Brief Worker
const dailyBriefWorker = new Worker(
    QUEUE_NAMES.DAILY_BRIEF,
    processDailyBrief,
    {
        connection: redisConnection,
        concurrency: 2, // Process 2 briefs at a time
    }
)

// Document Processing Worker
const documentWorker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    processDocument,
    {
        connection: redisConnection,
        concurrency: 5, // Process 5 documents concurrently
    }
)

// Email Processing Worker
const emailWorker = new Worker(
    QUEUE_NAMES.EMAIL_PROCESSING,
    processEmail,
    {
        connection: redisConnection,
        concurrency: 10, // Process 10 emails concurrently
    }
)

// Source Sync Worker
const sourceSyncWorker = new Worker(
    QUEUE_NAMES.SOURCE_SYNC,
    processSourceSync,
    {
        connection: redisConnection,
        concurrency: 3, // Process 3 syncs concurrently
    }
)

// Event Handlers
dailyBriefWorker.on('completed', (job) => {
    console.log(`✅ Daily brief job ${job.id} completed`)
})

dailyBriefWorker.on('failed', (job, err) => {
    console.error(`❌ Daily brief job ${job?.id} failed:`, err.message)
})

documentWorker.on('completed', (job) => {
    console.log(`✅ Document job ${job.id} completed`)
})

documentWorker.on('failed', (job, err) => {
    console.error(`❌ Document job ${job?.id} failed:`, err.message)
})

emailWorker.on('completed', (job) => {
    console.log(`✅ Email job ${job.id} completed`)
})

emailWorker.on('failed', (job, err) => {
    console.error(`❌ Email job ${job?.id} failed:`, err.message)
})

sourceSyncWorker.on('completed', (job) => {
    console.log(`✅ Source sync job ${job.id} completed`)
})

sourceSyncWorker.on('failed', (job, err) => {
    console.error(`❌ Source sync job ${job?.id} failed:`, err.message)
})

// Worker health logging
setInterval(async () => {
    const workers = [dailyBriefWorker, documentWorker, emailWorker, sourceSyncWorker]
    const status = await Promise.all(workers.map(w => w.isRunning()))

    console.log('\n📊 Worker Status:')
    console.log(`  Daily Brief: ${status[0] ? '✅' : '❌'}`)
    console.log(`  Documents: ${status[1] ? '✅' : '❌'}`)
    console.log(`  Emails: ${status[2] ? '✅' : '❌'}`)
    console.log(`  Source Sync: ${status[3] ? '✅' : '❌'}`)
}, 60000) // Every minute

// Graceful shutdown
async function shutdown() {
    console.log('\n🛑 Shutting down workers...')

    await Promise.all([
        dailyBriefWorker.close(),
        documentWorker.close(),
        emailWorker.close(),
        sourceSyncWorker.close(),
    ])

    await closeQueues()

    console.log('👋 Workers shut down gracefully')
    process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log('✅ All workers started successfully')
console.log('  - Daily Brief Worker (concurrency: 2)')
console.log('  - Document Worker (concurrency: 5)')
console.log('  - Email Worker (concurrency: 10)')
console.log('  - Source Sync Worker (concurrency: 3)')
console.log('\nWaiting for jobs...')
