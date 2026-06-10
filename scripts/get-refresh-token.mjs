// Engångsscript: hämtar en OAuth2 refresh token för Drive-uppladdning.
//
// Förutsättning:
//   1. Skapa en OAuth client ID (typ: Web application) i Google Cloud Console.
//   2. Lägg till http://localhost:5555/oauth2callback som Authorized redirect URI.
//   3. Fyll i GOOGLE_CLIENT_ID och GOOGLE_CLIENT_SECRET i .env.local.
//
// Kör:  node scripts/get-refresh-token.mjs
// Öppna URL:en som skrivs ut, godkänn, och klistra in refresh-token i .env.local.

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { google } from 'googleapis'

const PORT = 5555
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// Enkel .env.local-parser (ingen dotenv-dependency)
function loadEnv() {
  const env = {}
  let raw
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  } catch {
    return env
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    env[key] = val
  }
  return env
}

const env = loadEnv()
const clientId = env.GOOGLE_CLIENT_ID
const clientSecret = env.GOOGLE_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error('Fel: GOOGLE_CLIENT_ID och GOOGLE_CLIENT_SECRET måste fyllas i i .env.local först.')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // tvinga fram refresh_token även vid upprepad körning
  scope: SCOPES,
})

const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404).end()
    return
  }

  const url = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`Avbröts: ${error}`)
    console.error(`\nAvbröts: ${error}`)
    server.close()
    process.exit(1)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<p>Klart! Du kan stänga den här fliken och gå tillbaka till terminalen.</p>')

    if (!tokens.refresh_token) {
      console.error('\nIngen refresh_token returnerades. Återkalla appens åtkomst på')
      console.error('https://myaccount.google.com/permissions och kör scriptet igen.')
      server.close()
      process.exit(1)
    }

    console.log('\n=== Klart! Klistra in följande i .env.local ===\n')
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`)
    server.close()
    process.exit(0)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Misslyckades att hämta token. Se terminalen.')
    console.error('\nFel vid token-utbyte:', err.message)
    server.close()
    process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log('Öppna denna URL i webbläsaren och godkänn åtkomsten:\n')
  console.log(authUrl + '\n')
  console.log(`Väntar på callback på ${REDIRECT_URI} ...`)
})
