import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/integrations/google-drive/client'

/**
 * API Route: Start Google OAuth Flow
 *
 * GET /api/oauth/google/authorize?dealId={dealId}
 *
 * Redirects user to Google OAuth consent screen
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
        console.error('Google OAuth authorize error:', error)
        return NextResponse.json(
            {
                error: 'Failed to start Google OAuth flow',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
