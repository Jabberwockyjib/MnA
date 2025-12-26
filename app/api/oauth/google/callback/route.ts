import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/oauth/google-oauth'
import { encryptToken } from '@/lib/crypto/token-encryption'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route: Google OAuth Callback
 *
 * GET /api/oauth/google/callback?code={code}&error={error}
 *
 * Handles OAuth callback from Google after user authorization.
 * Exchanges authorization code for tokens, encrypts them, and stores
 * in the user_oauth_connections table.
 *
 * Redirects to /settings with success or error query parameters.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth error from Google
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL('/settings?error=oauth_denied', request.url)
    )
  }

  // Validate authorization code is present
  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?error=oauth_no_code', request.url)
    )
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens from Google')
    }

    // Get Google user info
    const userInfo = await getGoogleUserInfo(tokens.access_token)

    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login?error=not_authenticated', request.url)
      )
    }

    // Encrypt tokens
    const encryptedAccess = encryptToken(tokens.access_token)
    const encryptedRefresh = encryptToken(tokens.refresh_token)

    // Upsert OAuth connection
    const { error: upsertError } = await supabase
      .from('user_oauth_connections')
      .upsert({
        user_id: user.id,
        provider: 'google',
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour
        scopes: ['drive.readonly', 'gmail.readonly'],
        provider_user_id: userInfo.id,
        provider_email: userInfo.email,
        is_active: true,
        last_refresh_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return NextResponse.redirect(
        new URL('/settings?error=database_error', request.url)
      )
    }

    console.log(`✅ Google OAuth connected for user ${user.id} (${userInfo.email})`)

    return NextResponse.redirect(
      new URL('/settings?success=google_connected', request.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?error=oauth_failed', request.url)
    )
  }
}
