import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Max filstorlek per bild (20 MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024

// OAuth2 med lagrad refresh token — filer ägs av ditt Google-konto (använder din kvot).
// Service accounts saknar lagringskvot och kan inte äga filer på personligt Gmail.
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

interface FileMeta {
  name: string
  type: string
  size: number
}

interface SessionResult {
  name: string
  uploadUrl?: string
  error?: string
}

// Denna route strömmar inte längre bildbytes genom Vercel-funktionen
// (som har en hård payload-gräns på 4.5MB). Den startar bara en
// resumable-upload-session hos Google, och klienten PUT:ar sedan
// bilddatan direkt till Google.
export async function POST(request: NextRequest) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!folderId) {
      console.error('GOOGLE_DRIVE_FOLDER_ID saknas')
      return NextResponse.json({ error: 'Servern är felkonfigurerad' }, { status: 500 })
    }

    const { files } = (await request.json()) as { files: FileMeta[] }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Inga filer hittades' }, { status: 400 })
    }

    const { token } = await oauth2Client.getAccessToken()
    if (!token) {
      console.error('Kunde inte hämta access token')
      return NextResponse.json({ error: 'Servern är felkonfigurerad' }, { status: 500 })
    }

    const sessions: SessionResult[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        sessions.push({ name: file.name, error: 'Fel filtyp' })
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        sessions.push({ name: file.name, error: 'För stor fil' })
        continue
      }

      const initRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': file.type,
            'X-Upload-Content-Length': String(file.size),
          },
          body: JSON.stringify({
            name: file.name,
            parents: [folderId],
          }),
        },
      )

      if (!initRes.ok) {
        console.error('Kunde inte starta upload-session:', await initRes.text())
        sessions.push({ name: file.name, error: 'Kunde inte starta uppladdning' })
        continue
      }

      const uploadUrl = initRes.headers.get('location')
      if (!uploadUrl) {
        sessions.push({ name: file.name, error: 'Ingen upload-URL mottagen' })
        continue
      }

      sessions.push({ name: file.name, uploadUrl })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Upload-session error:', error)
    return NextResponse.json({ error: 'Uppladdningen misslyckades' }, { status: 500 })
  }
}
