import { Job } from 'bullmq'
import { DailyBriefJobData } from '@/lib/queue/jobs'
import { generateDailyBrief, saveBrief } from '@/lib/services/brief-generator'

/**
 * Daily Brief Worker Processor
 *
 * Generates daily briefs in the background
 * From originplan.md Section 5.5: Daily Deal Brief (the product)
 */

export async function processDailyBrief(job: Job<DailyBriefJobData>) {
    const { dealId, date } = job.data

    console.log(`🔄 Processing daily brief for deal ${dealId} on ${date}`)

    try {
        // Update job progress
        await job.updateProgress(10)

        // Generate the brief data
        console.log(`  📊 Analyzing deal data...`)
        const briefData = await generateDailyBrief(dealId)

        await job.updateProgress(70)

        // Save to database
        console.log(`  💾 Saving brief to database...`)
        const savedBrief = await saveBrief(dealId, briefData)

        await job.updateProgress(100)

        console.log(`✅ Daily brief generated successfully: ${savedBrief.id}`)

        return {
            success: true,
            briefId: savedBrief.id,
            dealId,
            date,
        }
    } catch (error) {
        console.error(`❌ Failed to generate daily brief for deal ${dealId}:`, error)
        throw error // Let BullMQ handle retries
    }
}
