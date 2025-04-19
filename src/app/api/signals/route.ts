import { NextRequest, NextResponse } from 'next/server';
import { blobService } from '@/lib/services/blob-service';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // First test the blob connection with detailed diagnostics
    const connectionTest = await blobService.testConnection();
    if (!connectionTest.success) {
      console.warn('Blob connection test failed but continuing with retrieval attempt:',
        JSON.stringify({
          error: connectionTest.error,
          configDiagnostics: connectionTest.configDiagnostics
        }, null, 2)
      );
    } else {
      console.log('Blob connection successful with configuration:', connectionTest.storeConfig);
    }

    // Get any query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');

    // Connection successful, get signals with diagnostics
    console.log(`Fetching signals with parameters: limit=${limit}, offset=${offset}, category=${category || 'all'}`);

    try {
      // Log the signals we're retrieving for debugging
      const allSignals = await blobService.getAllSignals();
      console.log(`Retrieved ${allSignals.length} total signals from blob storage`);

      // Apply any filtering
      let filteredSignals = allSignals;

      if (category) {
        filteredSignals = allSignals.filter(signal =>
          signal.llmCategory === category ||
          signal.leadType === category ||
          (signal.wormholeProcessed && category.toLowerCase() === 'wormhole')
        );
        console.log(`Filtered to ${filteredSignals.length} signals matching category: ${category}`);
      }

      // Apply pagination
      const paginatedSignals = filteredSignals.slice(offset, offset + limit);

      return NextResponse.json({
        status: 'success',
        signals: paginatedSignals,
        pagination: {
          total: filteredSignals.length,
          limit,
          offset,
          hasMore: offset + limit < filteredSignals.length
        },
        blobConnection: {
          status: connectionTest.success ? 'connected' : 'issues-detected',
          configPresent: {
            siteID: !!process.env.NETLIFY_SITE_ID,
            blobsToken: !!process.env.NETLIFY_BLOBS_TOKEN
          }
        }
      });
    } catch (fetchError) {
      console.error('Error fetching signals from blob storage:', fetchError);

      // Try a more direct approach as fallback
      try {
        console.log('Attempting direct blob store access as fallback...');
        // Move getSignalsStore call inside the function body
        const store = blobService.getSignalsStore();
        const signals = await store.getJSON('events') || [];

        console.log(`Retrieved ${signals.length} signals using fallback method`);

        return NextResponse.json({
          status: 'success',
          signals,
          fallback: true,
          warning: 'Used fallback retrieval method'
        });
      } catch (fallbackError) {
        console.error('Fallback signal retrieval also failed:', fallbackError);
        throw new Error(`Failed to retrieve signals after multiple attempts: ${fallbackError.message}`);
      }
    }
  } catch (error) {
    console.error('Failed to retrieve signals:', error);
    console.error('Error stack:', error.stack);

    // Last resort fallback: return empty array to avoid breaking the client
    return NextResponse.json({
      status: 'partial-error',
      message: 'Failed to retrieve signals from primary storage',
      errorDetail: error.message,
      signals: [],
      emergency: true
    }, { status: 207 }); // 207 Multi-Status
  }
}
