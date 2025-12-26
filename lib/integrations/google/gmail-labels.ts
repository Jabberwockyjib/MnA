import { google } from 'googleapis'
import { createOAuth2Client } from '@/lib/oauth/google-oauth'

export async function listGmailLabels(accessToken: string) {
  // Add input validation
  if (!accessToken?.trim()) {
    throw new Error('Access token is required')
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const response = await gmail.users.labels.list({
    userId: 'me',
  })

  // Filter out system labels, keep only user labels
  const labels = response.data.labels || []
  return labels
    .filter(label => label.type === 'user')
    .map(label => ({
      id: label.id || '',  // Use null coalescing instead of non-null assertion
      name: label.name || 'Untitled Label',  // Use null coalescing
    }))
    .filter(label => label.id && label.name)  // Filter out any invalid labels
    .sort((a, b) => a.name.localeCompare(b.name))
}
