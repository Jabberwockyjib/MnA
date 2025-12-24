import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/integrations/gmail/client'

/**
 * API Route: Start Gmail OAuth Flow
 *
 * GET /api/oauth/gmail/authorize?dealId={dealId}
 *
 * Redirects user to Google OAuth consent screen for Gmail access
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const dealId = searchParams.get('dealId')

        if (!dealId) {
            return NextResponse.json(
                { error: 'dealId is required' },
                { status: 400 }
            )
        }

        // Get Google OAuth authorization URL
        const authUrl = getAuthUrl()

        // Store deal ID in state parameter for callback
        const urlWithState = `${authUrl}&state=${encodeURIComponent(dealId)}`

        // Redirect to Google
        return NextResponse.redirect(urlWithState)
    } catch (error) {
        console.error('Gmail OAuth authorize error:', error)
        return NextResponse.json(
            {
                error: 'Failed to start Gmail OAuth flow',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
