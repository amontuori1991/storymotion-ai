export async function putPersistentAsset(name: string, data: Buffer, contentType: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      url: '',
      persistent: false,
      message: 'Storage persistente non configurato. Impostare BLOB_READ_WRITE_TOKEN su Vercel.'
    };
  }

  const { put } = await import('@vercel/blob');
  const blob = await put(name, data, {
    access: 'public',
    contentType
  });

  return {
    url: blob.url,
    persistent: true,
    message: 'Asset salvato su Vercel Blob.'
  };
}
