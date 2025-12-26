import { describe, it, expect, beforeAll } from '@jest/globals'
import {
  createOAuth2Client,
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getGoogleUserInfo,
} from '../google-oauth'

describe('Google OAuth', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  describe('createOAuth2Client', () => {
    it('should create OAuth2 client', () => {
      const client = createOAuth2Client()
      expect(client).toBeDefined()
    })

    it('should throw error when missing client credentials', () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_ID

      expect(() => createOAuth2Client()).toThrow(
        'Google OAuth credentials not configured'
      )

      process.env.GOOGLE_CLIENT_ID = originalClientId
    })

    it('should throw error when missing app URL', () => {
      const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL

      expect(() => createOAuth2Client()).toThrow(
        'NEXT_PUBLIC_APP_URL must be configured for OAuth'
      )

      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    })

    it('should throw error for invalid redirect URI', () => {
      const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_APP_URL = 'not-a-valid-url'

      expect(() => createOAuth2Client()).toThrow('Invalid redirect URI')

      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    })
  })

  describe('getAuthUrl', () => {
    it('should generate auth URL with correct scopes', () => {
      const url = getAuthUrl()
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain('scope=')
      expect(url).toContain('drive.readonly')
      expect(url).toContain('gmail.readonly')
      expect(url).toContain('access_type=offline')
    })
  })

  describe('Input validation', () => {
    it('should throw error for empty authorization code', async () => {
      await expect(exchangeCodeForTokens('')).rejects.toThrow(
        'Authorization code is required'
      )
    })

    it('should throw error for whitespace-only authorization code', async () => {
      await expect(exchangeCodeForTokens('   ')).rejects.toThrow(
        'Authorization code is required'
      )
    })

    it('should throw error for empty refresh token', async () => {
      await expect(refreshAccessToken('')).rejects.toThrow(
        'Refresh token is required'
      )
    })

    it('should throw error for empty access token', async () => {
      await expect(getGoogleUserInfo('')).rejects.toThrow(
        'Access token is required'
      )
    })
  })
})
