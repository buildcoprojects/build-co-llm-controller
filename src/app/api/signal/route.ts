import { NextRequest, NextResponse } from "next/server";
import { FormData, InterestType } from "@/lib/types";
import { blobService } from '@/lib/services/blob-service';
import { wormholeService } from '@/lib/services/wormhole-service';

// Mark this route as dynamic to allow API calls
export const dynamic = "force-dynamic";

// Process a signal submission
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    console.log('Received signal body:', JSON.stringify(body, null, 2));

    try {
      // Test blob connection first with enhanced diagnostic info
      const connectionTest = await blobService.testConnection();
      if (!connectionTest.success) {
        console.error('Blob connection test failed:', JSON.stringify(connectionTest, null, 2));
        // Continue anyway - we'll use fallback mechanisms in the blob service
        console.log('Continuing despite blob connection test failure - will use fallbacks if needed');
      } else {
        console.log('Blob connection test successful with store configuration:', connectionTest.storeConfig);
      }

      // Generate a unique ID
      const signalId = `evt_${Math.random().toString(36).substring(2, 10)}`;
      const timestamp = new Date().toISOString();

      // If there's artifact content, store it separately in the blob store
      let artifactResult = null;
      if (body.artifactContent) {
        console.log('Artifact content detected, storing in blob storage...');
        const artifactName = body.artifact || `artifact_${signalId}.pdf`;
        const contentType = body.artifactContentType || 'application/pdf';

        artifactResult = await blobService.storeArtifact(
          artifactName,
          body.artifactContent,
          contentType
        );

        console.log('Artifact storage result:', JSON.stringify({
          success: artifactResult.success,
          artifactKey: artifactResult.artifactKey,
          contentHash: artifactResult.contentHash
        }, null, 2));

        // Add artifact reference to the body
        if (artifactResult.success) {
          body.artifactKey = artifactResult.artifactKey;
          body.artifactContentHash = artifactResult.contentHash;
          // Don't store the full content in the signal - it's in blob storage now
          delete body.artifactContent;
        }
      }

      // Check for artefact content that should be processed through the wormhole
      let wormholeResult = null;
      if (body.artifactContent || (artifactResult && artifactResult.success)) {
        console.log('Checking for wormhole eligibility...');
        // Check if this is a wormhole artefact
        const isWormholeArtefact =
          body.wormhole === true ||
          (typeof body.artifactContent === 'string' && (
            body.artifactContent.includes('WORMHOLE_ENABLE') ||
            body.artifactContent.includes('WORMHOLE_PROTOCOL')
          ));

        if (isWormholeArtefact) {
          console.log('Wormhole artefact detected, processing...');
          wormholeResult = await wormholeService.processArtefact(
            body.artifactContent || (artifactResult ? `ARTIFACT_KEY:${artifactResult.artifactKey}` : ''),
            {
              signalId,
              timestamp,
              companyName: body.companyName,
              contactEmail: body.contactEmail,
              nodeReference: body.nodeReference,
              leadType: body.leadType,
              orderSize: body.orderSize,
              artifactName: body.artifact,
              artifactKey: artifactResult?.artifactKey,
              wormhole: true
            }
          );
        }
      }

      // Create the base signal object
      const newSignal = {
        id: signalId,
        timestamp,
        ...body,
        llmCategory: null,
        stripePaymentIntentId: null,
        wormholeProcessed: wormholeResult ? true : false,
        wormholeStatus: wormholeResult ? (wormholeResult.success ? 'success' : 'error') : null,
        artifactStored: artifactResult ? artifactResult.success : false,
        artifactKey: artifactResult?.artifactKey || null
      };

      // 1. Process Stripe payment if requested
      if (body.interestType?.stripe && body.orderSize > 0) {
        try {
          const stripeResponse = await fetch(`${request.nextUrl.origin}/api/stripe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderSize: body.orderSize,
              companyName: body.companyName,
              contactEmail: body.contactEmail,
              nodeReference: body.nodeReference,
              leadType: body.leadType
            })
          });

          const stripeData = await stripeResponse.json();

          if (stripeData.status === 'success') {
            newSignal.stripePaymentIntentId = stripeData.paymentIntentId;
            newSignal.stripeConfirmed = true;
          }
        } catch (stripeError) {
          console.error('Stripe processing error:', stripeError);
          newSignal.stripeError = stripeError.message;
        }
      }

      // 2. Process OpenAI classification if not already processed through wormhole
      if (!wormholeResult) {
        try {
          const openaiResponse = await fetch(`${request.nextUrl.origin}/api/openai`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              companyName: body.companyName,
              contactEmail: body.contactEmail,
              nodeReference: body.nodeReference,
              leadType: body.leadType,
              orderSize: body.orderSize,
              artifactName: body.artifact,
              artifactKey: artifactResult?.artifactKey,
              interestType: body.interestType
            })
          });

          const openaiData = await openaiResponse.json();

          if (openaiData.status === 'success') {
            newSignal.llmCategory = openaiData.classification;
            newSignal.llmConfidence = openaiData.confidence;
            newSignal.llmRationale = openaiData.rationale;
          }
        } catch (openaiError) {
          console.error('OpenAI processing error:', openaiError);
          newSignal.openaiError = openaiError.message;
        }
      } else {
        // Use the wormhole analysis results if available
        if (wormholeResult.analysis) {
          newSignal.llmCategory = wormholeResult.analysis.classification;
          newSignal.llmConfidence = wormholeResult.analysis.confidenceScore;
          newSignal.llmRationale = wormholeResult.analysis.summary;
          newSignal.wormholeActions = wormholeResult.actions;
          newSignal.wormholeExecutionResults = wormholeResult.executionResults;
        }
      }

      // 3. Add the signal to Netlify Blobs store with improved error handling
      console.log('Attempting to save signal to Netlify Blobs...');
      let blobSaveResult = false;
      let blobSaveError = null;

      try {
        // This will use the consistent 'events' key from blob-service.ts
        blobSaveResult = await blobService.addSignal(newSignal, { key: "events" });
        console.log('Successfully saved signal to Netlify Blobs');
      } catch (saveError) {
        console.error('Error saving to Netlify Blobs:', saveError);
        console.error('Save error stack:', saveError.stack);
        blobSaveError = saveError.message;

        // We'll continue and return success to the client even if blob save failed
        // The client shouldn't need to retry if our service accepted the signal
      }

      return NextResponse.json({
        status: 'success',
        event: newSignal,
        wormholeResult: wormholeResult,
        artifactResult: artifactResult ? {
          success: artifactResult.success,
          artifactKey: artifactResult.artifactKey,
          contentHash: artifactResult.contentHash
        } : null,
        blobStorage: {
          saveSuccess: blobSaveResult,
          error: blobSaveError
        }
      });
    } catch (blobError) {
      console.error('Blob storage operation failed:', blobError);
      console.error('Blob error stack:', blobError.stack);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to store signal in Blob storage',
        errorDetail: blobError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Signal save failed:', error);
    console.error('Full error stack:', error.stack);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to log signal',
      errorDetail: error.message
    }, { status: 500 });
  }
}

// For GET requests, return the signals
export async function GET() {
  try {
    // Test blob connection with detailed diagnostics
    const connectionTest = await blobService.testConnection();
    if (!connectionTest.success) {
      console.warn('Blob connection test failed but continuing with retrieval attempt:', connectionTest);
    }

    // Load signals from Blobs store using our service with fallback handling
    console.log('Getting all signals from blob storage...');
    const signals = await blobService.getAllSignals({ key: "events" });
    console.log(`Retrieved ${signals.length} signals from blob storage`);

    return NextResponse.json({
      status: 'success',
      signals,
      blobConnectionStatus: connectionTest.success ? 'connected' : 'connection-issues'
    });
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
