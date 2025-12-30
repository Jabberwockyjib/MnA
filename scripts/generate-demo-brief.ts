/**
 * Generate a daily brief for the demo deal
 * Run with: npx tsx scripts/generate-demo-brief.ts
 */

import { config } from 'dotenv'
config({ path: '.env' })

import { queueDailyBrief } from '../lib/queue/jobs'

async function main() {
    // Demo deal ID
    const dealId = 'fa34c84f-616e-423e-8291-8743782f355f'

    console.log('📋 Generating daily brief for demo deal...\n')

    const job = await queueDailyBrief(dealId)
    console.log(`   Job ID: ${job.id}`)
    console.log('\n✅ Brief generation queued!')
    console.log('   Check worker output for progress.')
    console.log('\n📍 View brief at: http://localhost:3011/briefs')

    process.exit(0)
}

main().catch(console.error)
