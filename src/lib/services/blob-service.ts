import { put, get } from '@netlify/blobs';

export async function writeSignalBlob(signal: any) {
  await put('signals', JSON.stringify(signal), {
    contentType: 'application/json',
  });
}

export async function readSignalsBlob() {
  const { body } = await get('signals');
  const data = await body?.text();
  return data ? JSON.parse(data) : [];
}
