import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/integrations/sharepoint/client'

/**
 * API Route: Start SharePoint OAuth Flow
 *
 * GET /api/oauth/sharepoint/authorize?dealId={dealId}
 *
 * Redirects user to Microsoft OAuth consent screen
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

        // Get Microsoft OAuth authorization URL
        const authUrl = await getAuthUrl(dealId)

        // Redirect to Microsoft
        return NextResponse.redirect(authUrl)
    } catch (error) {
        console.error('SharePoint OAuth authorize error:', error)
        return NextResponse.json(
            {
                error: 'Failed to start SharePoint OAuth flow',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
