import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/integrations/outlook/client'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route: Outlook OAuth Callback
 *
 * GET /api/oauth/outlook/callback?code={code}&state={dealId}
 *
 * Handles OAuth callback from Microsoft for Outlook access, stores tokens
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const dealId = searchParams.get('state') // Deal ID from state parameter
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
            console.error('Outlook OAuth error:', error, errorDescription)
            return NextResponse.redirect(
                `/settings?error=${encodeURIComponent('Outlook authorization failed')}`
            )
        }

        if (!code || !dealId) {
            return NextResponse.redirect(
                `/settings?error=${encodeURIComponent('Missing authorization code or deal ID')}`
            )
        }

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code)

        if (!tokens.accessToken) {
            throw new Error('No access token received')
        }

        // Save tokens to database
        const supabase = await createClient()

        const { error: dbError } = await supabase
            .from('source_connections')
            .upsert({
                deal_id: dealId,
                source_type: 'outlook',
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken || null,
                token_expires_at: tokens.expiresOn
                    ? new Date(tokens.expiresOn).toISOString()
                    : null,
                is_active: true,
                updated_at: new Date().toISOString(),
            })

        if (dbError) {
            console.error('Database error:', dbError)
            throw new Error('Failed to save connection')
        }

        console.log(`✅ Outlook connected for deal ${dealId}`)

        // Redirect back to settings with success message
        return NextResponse.redirect(
            `/settings?success=${encodeURIComponent('Outlook connected successfully')}`
        )
    } catch (error) {
        console.error('Outlook OAuth callback error:', error)
        return NextResponse.redirect(
            `/settings?error=${encodeURIComponent('Failed to connect Outlook')}`
        )
    }
}
