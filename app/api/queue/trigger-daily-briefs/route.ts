import { NextResponse } from 'next/server'
import { queueDailyBrief } from '@/lib/queue/jobs'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route: Manually Trigger Daily Briefs
 *
 * POST /api/queue/trigger-daily-briefs
 *
 * Queues daily brief jobs for all active deals
 */
export async function POST() {
    try {
        console.log('🔔 Manually triggering daily briefs...')

        const supabase = await createClient()

        // Fetch all active deals
        const { data: deals, error } = await supabase
            .from('deals')
            .select('id, name')
            .eq('status', 'active')

        if (error) {
            throw new Error(`Failed to fetch deals: ${error.message}`)
        }

        if (!deals || deals.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active deals found',
                queued: 0,
            })
        }

        // Queue a brief for each deal
        const results = []
        for (const deal of deals) {
            try {
                const job = await queueDailyBrief(deal.id)
                results.push({
                    dealId: deal.id,
                    dealName: deal.name,
                    jobId: job.id,
                    success: true,
                })
            } catch (error) {
                results.push({
                    dealId: deal.id,
                    dealName: deal.name,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        }

        const successCount = results.filter(r => r.success).length

        return NextResponse.json({
            success: true,
            message: `Queued briefs for ${successCount}/${deals.length} deals`,
            queued: successCount,
            results,
        })
    } catch (error) {
        console.error('Trigger daily briefs error:', error)
        return NextResponse.json(
            {
                error: 'Failed to trigger daily briefs',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
