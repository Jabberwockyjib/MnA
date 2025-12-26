import { describe, it, expect, beforeAll } from '@jest/globals'
import { createOAuth2Client, getAuthUrl } from '../google-oauth'

describe('Google OAuth', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  it('should create OAuth2 client', () => {
    const client = createOAuth2Client()
    expect(client).toBeDefined()
  })

  it('should generate auth URL with correct scopes', () => {
    const url = getAuthUrl()
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('scope=')
    expect(url).toContain('drive.readonly')
    expect(url).toContain('gmail.readonly')
    expect(url).toContain('access_type=offline')
  })
})
