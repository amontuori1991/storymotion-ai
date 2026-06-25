import { existsSync } from 'fs';
import { mkdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RemotionRenderProps } from '@/lib/render-types';

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

  const workDir = path.join(tmpdir(), `storymotion-${crypto.randomUUID()}`);
  const outputLocation = path.join(workDir, `${sanitizeFilename(payload.filename)}.mp4`);

  try {
    await mkdir(workDir, { recursive: true });
    const { renderMedia, selectComposition } = await import('@remotion/renderer');
    const browserExecutable = await getServerlessBrowserExecutable();
    const serveUrl = await getBundle();
    const composition = await selectComposition({
      serveUrl,
      id: 'StoryMotionVideo',
      inputProps,
      browserExecutable,
      chromiumOptions: browserExecutable
        ? {
            gl: 'swangle',
            enableMultiProcessOnLinux: true
          }
        : undefined,
      timeoutInMilliseconds: 120000
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation,
      inputProps,
      overwrite: true,
      pixelFormat: 'yuv420p',
      audioCodec: 'aac',
      crf: 18,
      concurrency: process.env.VERCEL
  ? 1
  : Math.max(1, require("os").cpus().length - 1),
      browserExecutable,
      chromiumOptions: browserExecutable
        ? {
            gl: 'swangle',
            enableMultiProcessOnLinux: true
          }
        : undefined,
      timeoutInMilliseconds: 180000,
      logLevel: 'warn',
      onProgress: () => undefined
    });

    const file = await readFile(outputLocation);
    const filename = `${sanitizeFilename(payload.filename)}.mp4`;

    return new NextResponse(file, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(file.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return renderingUnavailable(error instanceof Error ? error.message : String(error));
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
