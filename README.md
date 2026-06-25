# StoryMotion AI

Web app Next.js per creare video MP4 automatici con AI Vision, storytelling, Brand Kit, import sito, import recensioni Google, Remotion e FFmpeg.

## Deploy Vercel

1. Crea un progetto su Vercel e collega questo repository.
2. Imposta runtime Node.js standard di Next.js.
3. Aggiungi uno store Vercel Blob per asset persistenti.
4. Configura le variabili ambiente sotto.
5. Esegui deploy.

## Variabili Ambiente

```bash
NEXT_PUBLIC_APP_URL=https://tuo-dominio.vercel.app
NODE_ENV=production
OPENAI_API_KEY=sk-...
GOOGLE_PLACES_API_KEY=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
STORYMOTION_RENDER_MAX_IMAGES=60
STORYMOTION_ENABLE_CLIENT_API_KEYS=true
```

Le API key possono anche essere salvate da `/settings` per dispositivo. Per produzione multiutente è preferibile configurarle su Vercel.

## Storage Persistente

Lo storage persistente usa Vercel Blob tramite `BLOB_READ_WRITE_TOKEN`.

Da salvare in Blob:
- progetti
- foto caricate
- loghi
- Brand Kit esportati
- asset musicali
- video generati
- impostazioni utente sincronizzate

Senza `BLOB_READ_WRITE_TOKEN`, l’app mostra errore chiaro sulle API di storage e mantiene solo persistenza browser locale.

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
