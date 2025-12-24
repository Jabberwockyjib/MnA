import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { queueDailyBrief } from '@/lib/queue/jobs'

/**
 * Daily Brief Scheduler
 *
 * From originplan.md Section 5.5:
 * - Daily briefs generated automatically
 * - Default time: 8:00 AM
 */

// Supabase client for fetching active deals
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Schedule daily briefs for all active deals
 * Runs every day at 8:00 AM (configurable via DAILY_BRIEF_TIME env var)
 */
export function scheduleDailyBriefs() {
    // Default: 8:00 AM every day
    const cronTime = process.env.DAILY_BRIEF_TIME || '0 8 * * *'

    const task = cron.schedule(cronTime, async () => {
        console.log('\n⏰ Daily brief scheduler triggered')

        try {
            // Fetch all active deals
            const { data: deals, error } = await supabase
                .from('deals')
                .select('id, name')
                .eq('status', 'active')

            if (error) {
                console.error('❌ Failed to fetch active deals:', error)
                return
            }

            if (!deals || deals.length === 0) {
                console.log('  ℹ️ No active deals found')
                return
            }

            console.log(`  📋 Queueing briefs for ${deals.length} active deal(s)`)

            // Queue a brief generation job for each active deal
            for (const deal of deals) {
                try {
                    await queueDailyBrief(deal.id)
                    console.log(`    ✅ Queued brief for: ${deal.name}`)
                } catch (error) {
                    console.error(`    ❌ Failed to queue brief for ${deal.name}:`, error)
                }
            }

            console.log('  ✅ All daily briefs queued successfully')
        } catch (error) {
            console.error('❌ Daily brief scheduler error:', error)
        }
    }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'America/New_York',
    })

    console.log(`📅 Daily brief scheduler started: ${cronTime} (${process.env.TIMEZONE || 'America/New_York'})`)

    return task
}

/**
 * Manual trigger for testing
 */
export async function triggerDailyBriefsNow() {
    console.log('🔔 Manually triggering daily briefs...')

    const { data: deals } = await supabase
        .from('deals')
        .select('id, name')
        .eq('status', 'active')

    if (!deals || deals.length === 0) {
        console.log('No active deals found')
        return { queued: 0 }
    }

    let queued = 0
    for (const deal of deals) {
        await queueDailyBrief(deal.id)
        queued++
    }

    return { queued, deals: deals.length }
}
