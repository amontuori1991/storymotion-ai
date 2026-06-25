import { cpus, tmpdir } from 'os';
import { existsSync } from 'fs';
import { mkdir, readFile, rm } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RemotionRenderProps } from '@/lib/render-types';
import { putPersistentAsset } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 900;

const renderSchema = z.object({
  filename: z.string().min(1).max(90).default('storymotion-ai'),
  images: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        dataUrl: z.string().min(1)
      })
    )
    .min(0)
    .max(60),
  plan: z.object({
    title: z.string(),
    subtitle: z.string(),
    detectedMood: z.string(),
    template: z.string(),
    music: z.object({
      category: z.string(),
      recommendedTrack: z.string(),
      reason: z.string()
    }),
    scenes: z.array(
      z.object({
        imageName: z.string(),
        summary: z.string(),
        tags: z.array(z.string()),
        emotion: z.string(),
        importance: z.number()
      })
    ),
    chapters: z.array(
      z.object({
        label: z.string(),
        title: z.string(),
        text: z.string(),
        effect: z.string(),
        transition: z.string()
      })
    ),
    quotes: z.array(z.string()),
    timeline: z.array(z.string())
  }),
  templateName: z.string(),
  music: z.object({
    track: z.string(),
    volume: z.number().min(0).max(100),
    fadeIn: z.number().min(0).max(20),
    fadeOut: z.number().min(0).max(20)
  }),
  presetSettings: z.object({
    editRhythm: z.string(),
    musicType: z.string(),
    colorPalette: z.string(),
    transitionStyle: z.string(),
    textStyle: z.string(),
    sceneDuration: z.number().min(1).max(12),
    storyboardStyle: z.string()
  }),
  exportMode: z.enum(['standard', 'fair-tablet']).default('standard'),
  tabletLoop: z.boolean().default(false),
  finalCta: z.string().max(80).default('Visita lo stand'),
  brandKit: z
    .object({
      id: z.string(),
      name: z.string(),
      identity: z.object({
        businessName: z.string(),
        slogan: z.string(),
        description: z.string(),
        industry: z.string(),
        website: z.string(),
        email: z.string(),
        phone: z.string(),
        qrUrl: z.string().optional().default('')
      }),
      logos: z.object({
        main: z.string(),
        white: z.string(),
        transparent: z.string(),
        favicon: z.string()
      }),
      colors: z.object({
        primary: z.string(),
        secondary: z.string(),
        cta: z.string(),
        background: z.string(),
        text: z.string()
      }),
      typography: z.object({
        titleFont: z.string(),
        subtitleFont: z.string(),
        bodyFont: z.string()
      }),
      social: z.object({
        facebook: z.string(),
        instagram: z.string(),
        tiktok: z.string(),
        youtube: z.string(),
        linkedin: z.string()
      }),
      ctas: z.array(z.string()),
      assets: z.object({
        music: z.array(z.object({ name: z.string(), dataUrl: z.string() })),
        introVideo: z.string(),
        outroVideo: z.string(),
        institutionalImages: z.array(z.object({ name: z.string(), dataUrl: z.string() }))
      }),
      qrCode: z
        .object({
          mode: z.enum(['final', 'cta', 'always', 'none']).default('final'),
          label: z.string().default('Scansiona il QR Code')
        })
        .default({ mode: 'final', label: 'Scansiona il QR Code' })
    })
    .nullable()
    .default(null),
  contentSlides: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(['service', 'price', 'offer', 'faq', 'contact', 'cta', 'review', 'reputation']),
        title: z.string(),
        subtitle: z.string(),
        caption: z.string(),
        approved: z.boolean(),
        source: z.enum(['website', 'google']),
        rating: z.number().optional()
      })
    )
    .default([]),
  exportSettings: z.object({
    resolution: z.enum(['1080p', '4K']),
    fps: z.union([z.literal(30), z.literal(60)])
  })
});

let bundledServeUrl: Promise<string> | null = null;

const remotionDir = path.join(process.cwd(), 'remotion');
const remotionRootEntry = path.join(remotionDir, 'Root.tsx');

function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
  return cleaned || 'storymotion-ai';
}

function makeTone(track: string, sample: number, sampleRate: number) {
  const profile = track.toLowerCase();
  const t = sample / sampleRate;
  const action = profile.includes('action') || profile.includes('sport') || profile.includes('energy');
  const corporate = profile.includes('corporate') || profile.includes('business') || profile.includes('expo');
  const soft = profile.includes('piano') || profile.includes('ukulele') || profile.includes('strings');
  const base = action ? 110 : corporate ? 146 : soft ? 92 : 128;
  const chord = [base, base * 1.25, base * 1.5, base * 2];
  const beat = action ? (Math.sin(2 * Math.PI * 2.2 * t) > 0.75 ? 0.24 : 0) : corporate ? (Math.sin(2 * Math.PI * 1.4 * t) > 0.82 ? 0.16 : 0) : 0;
  const pad = chord.reduce((sum, freq, index) => sum + Math.sin(2 * Math.PI * freq * t) * (0.11 / (index + 1)), 0);
  const shimmer = Math.sin(2 * Math.PI * (base * 4) * t) * (soft ? 0.025 : 0.04);
  return Math.max(-0.8, Math.min(0.8, pad + shimmer + beat));
}

function createRoyaltyFreeWavDataUrl(track: string, seconds: number) {
  const sampleRate = 44100;
  const totalSamples = Math.max(sampleRate, Math.floor(seconds * sampleRate));
  const dataSize = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < totalSamples; i += 1) {
    const fade = Math.min(1, i / (sampleRate * 0.35), (totalSamples - i) / (sampleRate * 0.45));
    const value = Math.round(makeTone(track, i, sampleRate) * fade * 32767);
    buffer.writeInt16LE(value, 44 + i * 2);
  }

  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

async function createQrCodeDataUrl(url: string | undefined, enabled: boolean) {
  if (!url || !enabled) return '';
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
}

async function getServerlessBrowserExecutable() {
  if (!process.env.VERCEL) return null;
  const chromiumPackUrl = process.env.CHROMIUM_PACK_URL;
  if (!chromiumPackUrl) {
    throw new Error('CHROMIUM_PACK_URL non configurata. Usa @sparticuz/chromium-min con un chromium-pack.tar ospitato su storage pubblico veloce.');
  }
  const chromium = await import('@sparticuz/chromium-min');
  const executablePath = await chromium.default.executablePath(chromiumPackUrl);
  console.info('[StoryMotion render] Browser diagnostics', {
    chromiumPackUrl,
    executablePath,
    executableExists: existsSync(executablePath)
  });
  return executablePath;
}

async function getBundle() {
  if (!bundledServeUrl) {
    const { bundle } = await import('@remotion/bundler');
    const rootExists = existsSync(remotionRootEntry);
    const remotionDirExists = existsSync(remotionDir);
    console.info('[StoryMotion render] Remotion diagnostics', {
      cwd: process.cwd(),
      remotionDir,
      remotionDirExists,
      remotionRootEntry,
      remotionRootExists: rootExists
    });
    if (!rootExists) {
      throw new Error(`Remotion Root.tsx non trovato nel bundle server: ${remotionRootEntry}`);
    }
    bundledServeUrl = bundle({
      entryPoint: remotionRootEntry,
      onProgress: () => undefined,
      publicDir: path.join(process.cwd(), 'public'),
      enableCaching: true,
      ignoreRegisterRootWarning: true
    });
  }

  return bundledServeUrl;
}

function renderingUnavailable(message?: string) {
  return NextResponse.json(
    {
      error: 'Rendering reale non disponibile. Configurare Remotion/FFmpeg.',
      details: message
    },
    { status: 503 }
  );
}

const encoder = new TextEncoder();

function sseEvent(event: string, data: object): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// 1×1 transparent PNG — placeholder per immagini che non riescono a caricarsi
const PLACEHOLDER_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function fetchImageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  // Percorsi dello storage locale (relativi o assoluti con host arbitrario):
  // leggi direttamente dal filesystem per evitare roundtrip HTTP e problemi di porta.
  const localMatch = url.match(/\/api\/storage\/local\/([^/?#\s]+)/);
  if (localMatch) {
    const safeName = path.basename(localMatch[1]);
    const filepath = path.join(process.cwd(), '.local-blob-storage', safeName);
    const buffer = await readFile(filepath);
    const ext = path.extname(safeName).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const mimeType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Pool di concorrenza: avvia fino a `concurrency` worker in parallelo, ognuno
// consuma elementi dalla coda finché non è vuota, preservando l'ordine del risultato.
async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// Risolve tutti gli HTTP URL delle immagini in data URL base64 server-side.
// Cache per-request: la stessa URL viene scaricata una sola volta.
// In caso di errore su una singola immagine: logga e usa il placeholder, non interrompe.
async function resolveImages(
  images: Array<{ name: string; type: string; dataUrl: string }>
): Promise<Array<{ name: string; type: string; dataUrl: string }>> {
  if (images.length === 0) return images;
  const cache = new Map<string, string>();
  return withConcurrency(images, 5, async (img) => {
    const url = img.dataUrl;
    if (cache.has(url)) return { ...img, dataUrl: cache.get(url)! };
    try {
      const dataUrl = await fetchImageAsDataUrl(url);
      cache.set(url, dataUrl);
      return { ...img, dataUrl };
    } catch (err) {
      console.warn(
        `[StoryMotion render] Immagine non caricata "${img.name}" (${url.slice(0, 120)}):`,
        err instanceof Error ? err.message : err
      );
      cache.set(url, PLACEHOLDER_DATA_URL);
      return { ...img, dataUrl: PLACEHOLDER_DATA_URL };
    }
  });
}

export async function POST(request: Request) {
  const ffmpegModule = await import('@ffmpeg-installer/ffmpeg');
  const ffmpegPath = ffmpegModule.default?.path ?? ffmpegModule.path;

  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    return renderingUnavailable('FFmpeg non trovato nel runtime locale.');
  }

  let payload: z.infer<typeof renderSchema>;

  try {
    payload = renderSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json({ error: 'Dati render non validi', details: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }

  const fairMode = payload.exportMode === 'fair-tablet';
  const width = fairMode || payload.exportSettings.resolution === '1080p' ? 1920 : 3840;
  const height = fairMode || payload.exportSettings.resolution === '1080p' ? 1080 : 2160;
  const fps = fairMode ? 30 : payload.exportSettings.fps;
  const sceneCount = Math.max(1, payload.images.length);
  const estimatedDuration = fairMode ? 75 : Math.max(8, sceneCount * payload.presetSettings.sceneDuration + 2);
  const audioDataUrl = createRoyaltyFreeWavDataUrl(payload.music.track, Math.min(estimatedDuration, 12));
  const qrUrl = payload.brandKit?.identity.qrUrl || payload.brandKit?.identity.website;
  const qrMode = payload.brandKit?.qrCode?.mode ?? 'none';
  const qrCodeDataUrl = await createQrCodeDataUrl(qrUrl, Boolean(payload.brandKit && qrMode !== 'none'));
  const inputProps: RemotionRenderProps = {
    images: payload.images,
    plan: payload.plan,
    templateName: payload.templateName,
    music: payload.music,
    presetSettings: payload.presetSettings,
    exportMode: payload.exportMode,
    tabletLoop: payload.tabletLoop,
    finalCta: payload.finalCta,
    brandKit: payload.brandKit,
    contentSlides: payload.contentSlides,
    qrCodeDataUrl,
    audioDataUrl,
    fps,
    width,
    height
  };

  const filename = `${sanitizeFilename(payload.filename)}.mp4`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const workDir = path.join(tmpdir(), `storymotion-${crypto.randomUUID()}`);
      const outputLocation = path.join(workDir, filename);

      try {
        await mkdir(workDir, { recursive: true });

        // Risolvi tutti gli HTTP URL in data URL base64 prima di passare a Chromium.
        // Chromium non ha accesso garantito a localhost né a URL remoti dall'interno
        // del suo processo sandbox — i data URL eliminano qualsiasi dipendenza di rete.
        controller.enqueue(sseEvent('progress', { phase: 'resolving', progress: 3, message: 'Caricamento immagini dal storage...' }));

        const resolvedImages = await resolveImages(inputProps.images);
        const resolvedInputProps: RemotionRenderProps = { ...inputProps, images: resolvedImages };

        controller.enqueue(sseEvent('progress', { phase: 'bundling', progress: 8, message: 'Compilazione bundle Remotion...' }));

        const { renderMedia, selectComposition } = await import('@remotion/renderer');
        const browserExecutable = await getServerlessBrowserExecutable();
        const serveUrl = await getBundle();

        controller.enqueue(sseEvent('progress', { phase: 'composition', progress: 18, message: 'Avvio Chromium e selezione composizione...' }));

        const composition = await selectComposition({
          serveUrl,
          id: 'StoryMotionVideo',
          inputProps: resolvedInputProps,
          browserExecutable,
          chromiumOptions: browserExecutable
            ? {
                gl: 'swangle',
                enableMultiProcessOnLinux: true
              }
            : undefined,
          timeoutInMilliseconds: 120000
        });

        controller.enqueue(sseEvent('progress', { phase: 'rendering', progress: 22, message: 'Avvio rendering frame...' }));

        let lastPct = -1;
        await renderMedia({
          composition,
          serveUrl,
          codec: 'h264',
          outputLocation,
          inputProps: resolvedInputProps,
          overwrite: true,
          pixelFormat: 'yuv420p',
          audioCodec: 'aac',
          crf: 23,
          concurrency: process.env.VERCEL ? 1 : Math.max(1, cpus().length - 1),
          browserExecutable,
          chromiumOptions: browserExecutable
            ? {
                gl: 'swangle',
                enableMultiProcessOnLinux: true
              }
            : undefined,
          timeoutInMilliseconds: 180000,
          logLevel: 'warn',
          onProgress: (info) => {
            const pct = Math.round((info.progress ?? 0) * 100);
            if (pct === lastPct) return;
            lastPct = pct;
            const mapped = 22 + Math.round((info.progress ?? 0) * 66);
            controller.enqueue(
              sseEvent('progress', {
                phase: 'rendering',
                progress: mapped,
                message: `Rendering frame... ${pct}%`
              })
            );
          }
        });

        controller.enqueue(sseEvent('progress', { phase: 'uploading', progress: 90, message: 'Salvataggio video su storage...' }));

        const file = await readFile(outputLocation);
        const { url } = await putPersistentAsset(filename, file, 'video/mp4');

        controller.enqueue(sseEvent('done', { url, filename }));
        controller.close();
      } catch (error) {
        try {
          controller.enqueue(sseEvent('error', { message: error instanceof Error ? error.message : String(error) }));
          controller.close();
        } catch {
          // stream già chiuso
        }
      } finally {
        await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
