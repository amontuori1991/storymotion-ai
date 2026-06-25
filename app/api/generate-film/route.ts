import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { buildDemoStory } from '@/lib/story-fallback';
import type { StoryPlan, TemplateId } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const payloadSchema = z.object({
  context: z.string().max(2000),
  templateId: z.string(),
  music: z.object({
    track: z.string(),
    volume: z.number(),
    fadeIn: z.number(),
    fadeOut: z.number()
  }),
  presetSettings: z.object({
    editRhythm: z.string(),
    musicType: z.string(),
    colorPalette: z.string(),
    transitionStyle: z.string(),
    textStyle: z.string(),
    sceneDuration: z.number(),
    storyboardStyle: z.string()
  }),
  brandKit: z
    .object({
      name: z.string(),
      identity: z.object({
        businessName: z.string(),
        slogan: z.string(),
        description: z.string(),
        industry: z.string(),
        website: z.string(),
        email: z.string(),
        phone: z.string()
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
      ctas: z.array(z.string())
    })
    .nullable()
    .optional(),
  importedContent: z.unknown().optional(),
  exportSettings: z.object({
    resolution: z.enum(['1080p', '4K']),
    fps: z.union([z.literal(30), z.literal(60)])
  }),
  images: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        dataUrl: z.string()
      })
    )
    .max(20)
});

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload non valido', details: parsed.error.flatten() }, { status: 400 });
  }

  const { context, templateId, images, music, presetSettings, brandKit, exportSettings } = parsed.data;
  const normalizedTemplate = templateId as TemplateId;

  const openAiKey = request.headers.get('x-openai-api-key') || process.env.OPENAI_API_KEY;

  if (!openAiKey) {
    return NextResponse.json({
      mode: 'demo',
      plan: buildDemoStory({
        context,
        templateId: normalizedTemplate,
        presetSettings,
        imageNames: images.map((image) => image.name)
      }),
      previewUrl: '/sample-preview.mp4',
      exportUrl: `/api/render-film?resolution=${exportSettings.resolution}&fps=${exportSettings.fps}&track=${encodeURIComponent(music.track)}`
    });
  }

  const openai = new OpenAI({ apiKey: openAiKey });
  const visionImages = images.slice(0, 12).map((image) => ({
    type: 'input_image' as const,
    image_url: image.dataUrl,
    detail: 'low' as const
  }));

  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: [
      {
        role: 'system',
        content:
          'Sei un regista video e photo editor senior. Analizza immagini per persone, bambini, paesaggi, animali, sport, edifici, tramonti, sorrisi, emozioni e scene importanti. Rispondi solo JSON valido.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Crea storyboard professionale per StoryMotion AI.
Contesto utente: ${context}
Template: ${templateId}
Musica richiesta: ${music.track}
Preset professionale:
- ritmo montaggio: ${presetSettings.editRhythm}
- tipologia musica: ${presetSettings.musicType}
- palette colori: ${presetSettings.colorPalette}
- transizioni: ${presetSettings.transitionStyle}
- stile testi: ${presetSettings.textStyle}
- durata scene: ${presetSettings.sceneDuration}s
- storyboard: ${presetSettings.storyboardStyle}
Brand Kit: ${brandKit ? `${brandKit.identity.businessName} / ${brandKit.identity.slogan} / CTA: ${brandKit.ctas.join(', ')}` : 'nessuno'}
Export: ${exportSettings.resolution}, ${exportSettings.fps} fps

Schema JSON obbligatorio:
{
  "title": "string",
  "subtitle": "string",
  "detectedMood": "string",
  "template": "string",
  "music": {"category":"string","recommendedTrack":"string","reason":"string"},
  "scenes": [{"imageName":"string","summary":"string","tags":["string"],"emotion":"string","importance":8}],
  "chapters": [{"label":"INTRO","title":"string","text":"string","effect":"Ken Burns Effect","transition":"Cross Dissolve"}],
  "quotes": ["string"],
  "timeline": ["string"]
}`
          },
          ...visionImages
        ]
      }
    ],
    text: {
      format: {
        type: 'json_object'
      }
    }
  });

  const output = response.output_text;
  const plan = JSON.parse(output) as StoryPlan;

  return NextResponse.json({
    mode: 'ai',
    plan,
    previewUrl: '/sample-preview.mp4',
    exportUrl: `/api/render-film?resolution=${exportSettings.resolution}&fps=${exportSettings.fps}&track=${encodeURIComponent(music.track)}`
  });
}
