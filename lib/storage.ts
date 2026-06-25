import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

function safeAssetName(name: string) {
  const parsed = path.parse(name);
  const base = parsed.name.replace(/[^a-z0-9-_]/gi, '-').replace(/-+/g, '-').slice(0, 80) || 'asset';
  const ext = parsed.ext.replace(/[^a-z0-9.]/gi, '').slice(0, 12);
  return `${crypto.randomUUID()}-${base}${ext}`;
}

async function putLocalAsset(name: string, data: Buffer) {
  const filename = safeAssetName(name);
  const dir = path.join(process.cwd(), '.local-blob-storage');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), data);

  // URL relativo: funziona su qualsiasi porta senza NEXT_PUBLIC_APP_URL hardcoded.
  // Il client usa window.location.origin per costruire l'URL assoluto;
  // il server usa il filesystem diretto (fetchImageAsDataUrl lo rileva dal pattern).
  return {
    url: `/api/storage/local/${filename}`,
    persistent: true,
    provider: 'local' as const,
    message: 'Asset salvato nello storage locale di sviluppo.'
  };
}

export async function putPersistentAsset(name: string, data: Buffer, contentType: string) {
  if (process.env.VERCEL) {
    try {
      const { put } = await import('@vercel/blob');
      const blob = await put(safeAssetName(name), data, {
        access: 'public',
        contentType
      });

      return {
        url: blob.url,
        persistent: true,
        provider: 'vercel-blob' as const,
        message: 'Asset salvato su Vercel Blob tramite integrazione managed/OIDC.'
      };
    } catch (error) {
      return {
        url: '',
        persistent: false,
        provider: 'vercel-blob' as const,
        message:
          error instanceof Error
            ? `Storage Vercel Blob non disponibile: ${error.message}. Collega Blob da Vercel Storage -> Blob -> Connect to Project.`
            : 'Storage Vercel Blob non disponibile. Collega Blob da Vercel Storage -> Blob -> Connect to Project.'
      };
    }
  }

  return putLocalAsset(name, data);
}
