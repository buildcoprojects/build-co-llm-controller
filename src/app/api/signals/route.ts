import { NextResponse } from 'next/server';
import { blobService } from '@/lib/services/blob-service';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // First test the blob connection
    const connectionTest = await blobService.testConnection();
    if (!connectionTest.success) {
      console.error('Blob connection test failed:', connectionTest.error);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to Blob storage',
        errorDetail: connectionTest.error
      }, { status: 500 });
    }

    // Connection successful, get signals
    const signals = await blobService.getAllSignals();
    return NextResponse.json({ status: 'success', signals });
  } catch (error) {
    console.error('Failed to retrieve signals:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve signals',
      errorDetail: error.message
    }, { status: 500 });
  }
}
