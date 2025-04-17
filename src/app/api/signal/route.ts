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
      // Test blob connection first
      const connectionTest = await blobService.testConnection();
      if (!connectionTest.success) {
        console.error('Blob connection test failed:', connectionTest.error);
        return NextResponse.json({
          status: 'error',
          message: 'Failed to connect to Blob storage',
          errorDetail: connectionTest.error
        }, { status: 500 });
      }

      // Connection successful, proceed
      console.log('Blob connection test successful');

      // Generate a unique ID
      const signalId = `evt_${Math.random().toString(36).substring(2, 10)}`;
      const timestamp = new Date().toISOString();

      // Check for artefact content that should be processed through the wormhole
      let wormholeResult = null;
      if (body.artifactContent) {
        console.log('Artefact content detected, checking for wormhole eligibility...');
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
            body.artifactContent,
            {
              signalId,
              timestamp,
              companyName: body.companyName,
              contactEmail: body.contactEmail,
              nodeReference: body.nodeReference,
              leadType: body.leadType,
              orderSize: body.orderSize,
              artifactName: body.artifact,
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
        wormholeStatus: wormholeResult ? (wormholeResult.success ? 'success' : 'error') : null
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

      // 3. Add the signal to Netlify Blobs store
      console.log('Attempting to save signal to Netlify Blobs...');
      try {
        await blobService.addSignal(newSignal);
        console.log('Successfully saved signal to Netlify Blobs');
        return NextResponse.json({
          status: 'success',
          event: newSignal,
          wormholeResult: wormholeResult
        });
      } catch (saveError) {
        console.error('Error saving to Netlify Blobs:', saveError);
        console.error('Save error stack:', saveError.stack);

        return NextResponse.json({
          status: 'error',
          message: 'Failed to store signal in Blob storage',
          errorDetail: saveError.message
        }, { status: 500 });
      }
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
    // Load signals from Blobs store using our service
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
