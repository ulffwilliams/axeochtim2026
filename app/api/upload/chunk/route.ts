import { NextRequest, NextResponse } from 'next/server'

// Tar emot en enskild chunk från klienten och vidarebefordrar den till
// Googles resumable-upload-session server-till-server (Drive API stödjer
// inte CORS för direkt-PUT från webbläsare, så det måste passera här).
export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get('x-upload-url')
    const contentRange = request.headers.get('x-content-range')

    if (!uploadUrl || !contentRange) {
      return NextResponse.json({ error: 'Saknar chunk-metadata' }, { status: 400 })
    }

    if (!uploadUrl.startsWith('https://www.googleapis.com/')) {
      return NextResponse.json({ error: 'Ogiltig upload-URL' }, { status: 400 })
    }

    const chunk = await request.arrayBuffer()

    const googleRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': contentRange,
        'Content-Length': String(chunk.byteLength),
      },
      body: chunk,
    })

    if (googleRes.status === 200 || googleRes.status === 201) {
      const file = await googleRes.json()
      return NextResponse.json({ done: true, file })
    }

    if (googleRes.status === 308) {
      return NextResponse.json({ done: false })
    }

    console.error('Chunk-uppladdning misslyckades:', googleRes.status, await googleRes.text())
    return NextResponse.json({ error: 'Chunk misslyckades' }, { status: 502 })
  } catch (error) {
    console.error('Chunk-proxy error:', error)
    return NextResponse.json({ error: 'Serverfel' }, { status: 500 })
  }
}
