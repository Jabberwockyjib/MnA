/**
 * Test script for worker job execution
 * Run with: npx tsx scripts/test-worker.ts
 */

import { config } from 'dotenv'
config({ path: '.env' })

import { queueSourceSync, queueDailyBrief, getQueueStats } from '../lib/queue/jobs'

async function main() {
    console.log('🧪 Testing worker job queue...\n')

    // Get the test deal ID from the database
    const dealId = '4ea9bce1-2086-4f31-b9f7-c3a2f0bff63c' // Your existing test deal

    console.log('📊 Current queue stats:')
    const statsBefore = await getQueueStats()
    console.log(JSON.stringify(statsBefore, null, 2))

    console.log('\n📋 Queueing a daily brief job...')
    const briefJob = await queueDailyBrief(dealId)
    console.log(`   Job ID: ${briefJob.id}`)

    console.log('\n🔄 Queueing a source sync job (gdrive)...')
    const syncJob = await queueSourceSync(dealId, 'gdrive', 'incremental')
    console.log(`   Job ID: ${syncJob.id}`)

    // Wait a moment for stats to update
    await new Promise(r => setTimeout(r, 1000))

    console.log('\n📊 Queue stats after adding jobs:')
    const statsAfter = await getQueueStats()
    console.log(JSON.stringify(statsAfter, null, 2))

    console.log('\n✅ Jobs queued! Check worker output for processing.')
    console.log('   (Worker should pick these up if running)')

    process.exit(0)
}

main().catch(console.error)
