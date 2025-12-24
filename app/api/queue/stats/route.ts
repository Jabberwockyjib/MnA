import { NextResponse } from 'next/server'
import { getQueueStats } from '@/lib/queue/jobs'

/**
 * API Route: Queue Statistics
 *
 * GET /api/queue/stats
 *
 * Returns job counts for all queues
 */
export async function GET() {
    try {
        const stats = await getQueueStats()

        return NextResponse.json({
            success: true,
            stats,
        })
    } catch (error) {
        console.error('Queue stats error:', error)
        return NextResponse.json(
            {
                error: 'Failed to get queue stats',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
