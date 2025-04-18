import { readSignalsBlob } from '@/lib/services/blob-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await readSignalsBlob();
  return NextResponse.json(data);
}