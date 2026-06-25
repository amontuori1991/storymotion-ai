import { NextResponse } from 'next/server';
import { z } from 'zod';
import { putPersistentAsset } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 120;

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  dataUrl: z.string().startsWith('data:')
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Upload non valido' }, { status: 400 });

  const [, base64] = parsed.data.dataUrl.split(',');
  const buffer = Buffer.from(base64, 'base64');
  const result = await putPersistentAsset(parsed.data.filename, buffer, parsed.data.contentType);

  if (!result.persistent) {
    return NextResponse.json({ error: result.message }, { status: 503 });
  }

  return NextResponse.json(result);
}
