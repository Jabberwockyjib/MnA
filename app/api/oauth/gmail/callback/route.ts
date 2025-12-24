import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/integrations/gmail/client'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route: Gmail OAuth Callback
 *
 * GET /api/oauth/gmail/callback?code={code}&state={dealId}
 *
 * Handles OAuth callback from Google for Gmail access, stores tokens
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const dealId = searchParams.get('state') // Deal ID from state parameter
        const error = searchParams.get('error')

        if (error) {
            console.error('Gmail OAuth error:', error)
            return NextResponse.redirect(
                `/settings?error=${encodeURIComponent('Gmail authorization failed')}`
            )
        }

        if (!code || !dealId) {
            return NextResponse.redirect(
                `/settings?error=${encodeURIComponent('Missing authorization code or deal ID')}`
            )
        }

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code)

        if (!tokens.access_token) {
            throw new Error('No access token received')
        }

        // Save tokens to database
        const supabase = await createClient()

        const { error: dbError } = await supabase
            .from('source_connections')
            .upsert({
                deal_id: dealId,
                source_type: 'gmail',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || null,
                token_expires_at: tokens.expiry_date
                    ? new Date(tokens.expiry_date).toISOString()
                    : null,
                is_active: true,
                updated_at: new Date().toISOString(),
            })

        if (dbError) {
            console.error('Database error:', dbError)
            throw new Error('Failed to save connection')
        }

        console.log(`✅ Gmail connected for deal ${dealId}`)

        // Redirect back to settings with success message
        return NextResponse.redirect(
            `/settings?success=${encodeURIComponent('Gmail connected successfully')}`
        )
    } catch (error) {
        console.error('Gmail OAuth callback error:', error)
        return NextResponse.redirect(
            `/settings?error=${encodeURIComponent('Failed to connect Gmail')}`
        )
    }
}
