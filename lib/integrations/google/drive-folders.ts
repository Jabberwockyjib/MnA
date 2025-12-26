import { google } from 'googleapis'
import { createOAuth2Client } from '@/lib/oauth/google-oauth'

export async function listDriveFolders(accessToken: string, parentId: string = 'root') {
  if (!accessToken?.trim()) {
    throw new Error('Access token is required')
  }
  if (!parentId?.trim()) {
    throw new Error('Parent folder ID is required')
  }

  // Sanitize parentId to prevent query injection
  const sanitizedParentId = parentId.replace(/'/g, "\\'")

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  const response = await drive.files.list({
    q: `'${sanitizedParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
  })

  return response.data.files || []
}

export async function getDriveFolderInfo(accessToken: string, folderId: string) {
  if (!accessToken?.trim()) {
    throw new Error('Access token is required')
  }
  if (!folderId?.trim()) {
    throw new Error('Folder ID is required')
  }

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
  if (!accessToken?.trim()) {
    throw new Error('Access token is required')
  }
  if (!folderId?.trim()) {
    throw new Error('Folder ID is required')
  }

  const parts: string[] = []
  let currentId = folderId

  while (currentId && currentId !== 'root') {
    const folder = await getDriveFolderInfo(accessToken, currentId)
    parts.unshift(folder.name || 'Untitled Folder')

    if (folder.parents && folder.parents.length > 0) {
      currentId = folder.parents[0]
    } else {
      break
    }
  }

  return parts.join(' > ') || 'My Drive'
}
