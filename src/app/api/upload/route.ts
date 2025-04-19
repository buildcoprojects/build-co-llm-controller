import { NextRequest, NextResponse } from 'next/server';
import { blobService } from '@/lib/services/blob-service';
import * as pdfParse from 'pdf-parse';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain',
  'application/json',
  'text/yaml',
  'text/markdown',
];

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ status: 'error', message: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ status: 'error', message: `Filetype ${file.type} not allowed` }, { status: 400 });
  }

  // Generate paths
  const uploadFolder = file.type.startsWith('image/') ? 'chat-uploads/img' : 'chat-uploads';
  const filePath = `${uploadFolder}/${file.name}`;

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let pdfExtractedText = null;

  // If PDF, extract text
  if (file.type === 'application/pdf') {
    try {
      const pdfData = await pdfParse(buffer);
      pdfExtractedText = pdfData.text;
      // Save extracted text as separate blob
      const pdfTextPath = `chat-uploads/pdf-text/${file.name.replace(/\.[^.]+$/, '')}.txt`;
      const store = blobService.getSignalsStore();
      await store.set(pdfTextPath, pdfExtractedText, { metadata: { contentType: 'text/plain' } });
    } catch (err) {
      return NextResponse.json({ status: 'error', message: 'PDF parsing failed', detail: err?.message }, { status: 500 });
    }
  }

  // Store original file
  try {
    const store = blobService.getSignalsStore();
    await store.set(filePath, buffer, { metadata: { contentType: file.type, fileName: file.name } });
  } catch (err) {
    return NextResponse.json({ status: 'error', message: 'Failed to upload file', detail: err?.message }, { status: 500 });
  }

  // Respond with info
  return NextResponse.json({
    status: 'success',
    file: {
      url: `/api/blob/${filePath}`,
      name: file.name,
      mimetype: file.type,
      ...(pdfExtractedText && { extractedText: pdfExtractedText })
    }
  });
}
