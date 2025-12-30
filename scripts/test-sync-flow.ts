/**
 * Test full sync flow
 * Run with: npx tsx scripts/test-sync-flow.ts
 */

import { config } from 'dotenv'
config({ path: '.env' })

import { queueSourceSync } from '../lib/queue/jobs'

async function main() {
    const dealId = '4ea9bce1-2086-4f31-b9f7-c3a2f0bff63c'

    console.log('🧪 Testing full sync flow...\n')

    console.log('📁 Queueing Google Drive sync...')
    const driveJob = await queueSourceSync(dealId, 'gdrive', 'full')
    console.log(`   Job ID: ${driveJob.id}`)

    console.log('\n✉️ Queueing Gmail sync...')
    const gmailJob = await queueSourceSync(dealId, 'gmail', 'full')
    console.log(`   Job ID: ${gmailJob.id}`)

    console.log('\n✅ Jobs queued! Check worker output for results.')
    console.log('   After completion, check database for new documents/emails.')

    process.exit(0)
}

main().catch(console.error)
