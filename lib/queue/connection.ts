import { Queue, Worker, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

/**
 * Redis Connection for Job Queue
 *
 * From originplan.md Section 4.4:
 * - Redis queue-based workers
 * - Background processing for heavy work
 */

// Redis connection configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null, // Required for BullMQ
}

// Create Redis connection
export const redisConnection = new Redis(redisConfig)

// Queue names
export const QUEUE_NAMES = {
    DAILY_BRIEF: 'daily-brief',
    DOCUMENT_PROCESSING: 'document-processing',
    EMAIL_PROCESSING: 'email-processing',
    SOURCE_SYNC: 'source-sync',
} as const

// Create queues
export const dailyBriefQueue = new Queue(QUEUE_NAMES.DAILY_BRIEF, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            count: 500, // Keep last 500 failed jobs for debugging
        },
    },
})

export const documentProcessingQueue = new Queue(QUEUE_NAMES.DOCUMENT_PROCESSING, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
})

export const emailProcessingQueue = new Queue(QUEUE_NAMES.EMAIL_PROCESSING, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
})

export const sourceSyncQueue = new Queue(QUEUE_NAMES.SOURCE_SYNC, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 10000,
        },
    },
})

// Queue events for monitoring
export const dailyBriefEvents = new QueueEvents(QUEUE_NAMES.DAILY_BRIEF, {
    connection: redisConnection,
})

// Graceful shutdown handler
export async function closeQueues() {
    await dailyBriefQueue.close()
    await documentProcessingQueue.close()
    await emailProcessingQueue.close()
    await sourceSyncQueue.close()
    await redisConnection.quit()
}

// Log queue connections
redisConnection.on('connect', () => {
    console.log('✅ Redis connected')
})

redisConnection.on('error', (err) => {
    console.error('❌ Redis connection error:', err)
})
