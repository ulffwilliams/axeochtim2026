import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

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

const drive = google.drive({ version: 'v3', auth: oauth2Client })

export async function POST(request: NextRequest) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!folderId) {
      console.error('GOOGLE_DRIVE_FOLDER_ID saknas')
      return NextResponse.json({ error: 'Servern är felkonfigurerad' }, { status: 500 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Inga filer hittades' }, { status: 400 })
    }

    const uploadedFiles = []
    const skipped: string[] = []

    for (const file of files) {
      // Validera filtyp server-side (inte bara klienten)
      if (!file.type.startsWith('image/')) {
        skipped.push(file.name)
        continue
      }

      // Validera filstorlek server-side
      if (file.size > MAX_FILE_SIZE) {
        skipped.push(file.name)
        continue
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const stream = Readable.from(buffer)

      const response = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [folderId],
        },
        media: {
          mimeType: file.type,
          body: stream,
        },
        fields: 'id, name, webViewLink',
      })

      uploadedFiles.push({
        id: response.data.id,
        name: response.data.name,
        link: response.data.webViewLink,
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
      skipped,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Uppladdningen misslyckades' }, { status: 500 })
  }
}
