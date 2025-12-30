/**
 * Clear failed jobs from queues
 * Run with: npx tsx scripts/clear-failed-jobs.ts
 */

import { config } from 'dotenv'
config({ path: '.env' })

import { dailyBriefQueue, sourceSyncQueue } from '../lib/queue/connection'

async function main() {
    console.log('🧹 Clearing failed jobs...\n')

    const dailyBriefFailed = await dailyBriefQueue.getFailed()
    console.log(`📋 Daily Brief: ${dailyBriefFailed.length} failed jobs`)
    for (const job of dailyBriefFailed) {
        console.log(`   Removing: ${job.id}`)
        await job.remove()
    }

    const sourceSyncFailed = await sourceSyncQueue.getFailed()
    console.log(`🔄 Source Sync: ${sourceSyncFailed.length} failed jobs`)
    for (const job of sourceSyncFailed) {
        console.log(`   Removing: ${job.id}`)
        await job.remove()
    }

    console.log('\n✅ Failed jobs cleared')
    process.exit(0)
}

main().catch(console.error)
