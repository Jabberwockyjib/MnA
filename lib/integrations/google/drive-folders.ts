import { google } from 'googleapis'
import { createOAuth2Client } from '@/lib/oauth/google-oauth'

export async function listDriveFolders(accessToken: string, parentId: string = 'root') {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  const response = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
  })

  return response.data.files || []
}

export async function getDriveFolderInfo(accessToken: string, folderId: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType, parents',
  })

  return response.data
}

export async function buildFolderPath(accessToken: string, folderId: string): Promise<string> {
  const parts: string[] = []
  let currentId = folderId

  while (currentId && currentId !== 'root') {
    const folder = await getDriveFolderInfo(accessToken, currentId)
    parts.unshift(folder.name!)

    if (folder.parents && folder.parents.length > 0) {
      currentId = folder.parents[0]
    } else {
      break
    }
  }

  return parts.join(' > ') || 'My Drive'
}
