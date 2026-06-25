# StoryMotion AI

Web app Next.js per creare video MP4 automatici con AI Vision, storytelling, Brand Kit, import sito, import recensioni Google, Remotion e FFmpeg.

## Deploy Vercel

1. Crea un progetto su Vercel e collega questo repository.
2. Imposta runtime Node.js standard di Next.js.
3. In Vercel vai su `Storage` -> `Blob` -> `Connect to Project` e collega uno store Blob al progetto.
4. Configura le variabili ambiente sotto.
5. Esegui deploy.

## Variabili Ambiente

```bash
NEXT_PUBLIC_APP_URL=https://tuo-dominio.vercel.app
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
STORYMOTION_RENDER_MAX_IMAGES=60
STORYMOTION_ENABLE_CLIENT_API_KEYS=true
```

Le API key possono anche essere salvate da `/settings` per dispositivo. Per produzione multiutente è preferibile configurarle su Vercel.

## Storage Persistente

Lo storage persistente usa Vercel Blob tramite integrazione managed/OIDC.

Su Vercel non serve configurare un token read/write manuale. Collega lo store da:

`Storage` -> `Blob` -> `Connect to Project`

Vercel configura automaticamente le variabili managed necessarie, tra cui:

- `BLOB_STORE_ID`
- `BLOB_WEBHOOK_PUBLIC_KEY`

Il codice chiama `@vercel/blob` senza passare token manuali. In locale, dove OIDC non e disponibile, gli asset vengono salvati in `.local-blob-storage` e serviti da `/api/storage/local/...`.

Da salvare in Blob:
- progetti
- foto caricate
- loghi
- Brand Kit esportati
- asset musicali
- video generati
- impostazioni utente sincronizzate

Se Blob non e collegato al progetto Vercel, l’app mostra un errore chiaro: collegare Blob da `Storage` -> `Blob` -> `Connect to Project`.

## Rendering MP4

Il rendering usa:
- `@remotion/renderer`
- `@remotion/bundler`
- `@ffmpeg-installer/ffmpeg`
- codec H264
- audio AAC

Nota produzione: rendering video lungo in serverless richiede funzioni con timeout/memoria adeguati. `vercel.json` imposta `maxDuration` e memoria per `/api/render-film`. Su piani Vercel con timeout più basso, usare Vercel Pro/Fluid Compute o spostare rendering su worker dedicato.

## QR Code

Nel Brand Kit:
- `URL principale QR Code`
- modalità: finale, CTA, sempre piccolo, disattivato

In Export Fiera / Tablet:
- QR finale attivo di default
- CTA: `PRENOTA ORA`
- testo: `Scansiona il QR Code`
- dimensione QR finale >= 220px in 1080p

## Test Locali

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Test render:
1. carica almeno una foto
2. genera storyboard
3. seleziona Brand Kit con URL QR
4. renderizza MP4
5. verifica MP4 con FFmpeg o player locale

## Google Reviews

Richiede `GOOGLE_PLACES_API_KEY` con Places API abilitata.

Se la chiave manca, l’app mostra:
`Import recensioni Google non disponibile. Configurare GOOGLE_PLACES_API_KEY.`

## Website Import

`/api/import-website` esegue scansione best-effort delle pagine principali del sito:
- home
- servizi
- prezzi
- contatti
- chi siamo
- FAQ
- offerte / promo

Le slide estratte sono sempre approvabili e modificabili prima del render.

## Deploy Trigger

Trigger Vercel deploy.
