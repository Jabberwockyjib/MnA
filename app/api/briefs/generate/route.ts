import { NextRequest, NextResponse } from 'next/server'
import { generateDailyBrief, saveBrief } from '@/lib/services/brief-generator'

/**
 * API Route: Generate Daily Brief
 *
 * POST /api/briefs/generate
 * Body: { dealId: string }
 *
 * Generates and saves a daily brief for the specified deal
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { dealId } = body

        if (!dealId) {
            return NextResponse.json(
                { error: 'dealId is required' },
                { status: 400 }
            )
        }

        console.log(`Generating daily brief for deal: ${dealId}`)

        // Generate the brief
        const briefData = await generateDailyBrief(dealId)

        // Save to database
        const savedBrief = await saveBrief(dealId, briefData)

        console.log(`Daily brief generated successfully: ${savedBrief.id}`)

        return NextResponse.json({
            success: true,
            brief: savedBrief,
        })
    } catch (error) {
        console.error('Brief generation error:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate daily brief',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/briefs/generate?dealId={dealId}
 *
 * Alternative GET endpoint for testing
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const dealId = searchParams.get('dealId')

        if (!dealId) {
            return NextResponse.json(
                { error: 'dealId parameter is required' },
                { status: 400 }
            )
        }

        const briefData = await generateDailyBrief(dealId)
        const savedBrief = await saveBrief(dealId, briefData)

        return NextResponse.json({
            success: true,
            brief: savedBrief,
        })
    } catch (error) {
        console.error('Brief generation error:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate daily brief',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
