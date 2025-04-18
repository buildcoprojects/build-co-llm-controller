import type { NextRequest } from 'next/server';
import { put } from '@netlify/blobs';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });
  }
  const key = `uploads/${Date.now()}-${file.name}`;
  await put(key, file, { contentType: file.type });
  return new Response(JSON.stringify({ url: key }), { status: 200 });
}
