import { NextRequest, NextResponse } from "next/server";
import { wormholeService } from '@/lib/services/wormhole-service';
import { blobService } from '@/lib/services/blob-service';

// Mark this route as dynamic to allow API calls
export const dynamic = "force-dynamic";

/**
 * Wormhole API
 *
 * Executes privileged wormhole commands and artefact processing
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    console.log('Received wormhole command:', JSON.stringify(body, null, 2));

    // Validate request has required fields
    if (!body.command || !body.artefact) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing required fields: command and artefact are required'
      }, { status: 400 });
    }

    // Process the wormhole command
    const result = await wormholeService.processArtefact(
      body.artefactContent || body.artefact,
      {
        id: `worm_${Math.random().toString(36).substring(2, 10)}`,
        timestamp: new Date().toISOString(),
        command: body.command,
        target: body.target,
        nodeReference: body.nodeReference,
        wormhole: true,
        source: 'api'
      }
    );

    // Save the result to blob storage for audit trail
    try {
      await blobService.addSignal({
        id: `audit_${Math.random().toString(36).substring(2, 10)}`,
        timestamp: new Date().toISOString(),
        type: 'wormhole_execution',
        command: body.command,
        target: body.target,
        result: {
          success: result.success,
          isWormhole: result.isWormhole,
          processed: result.processed,
          message: result.message
        },
        actions: result.actions
      });
    } catch (auditError) {
      console.error('Failed to save audit log:', auditError);
    }

    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      message: result.message,
      processed: result.processed,
      isWormhole: result.isWormhole,
      analysis: result.analysis,
      actions: result.actions,
      executionResults: result.executionResults
    });
  } catch (error) {
    console.error('Wormhole execution error:', error);
    console.error('Error stack:', error.stack);

    return NextResponse.json({
      status: 'error',
      message: 'Wormhole execution failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle GET requests for wormhole status
 */
export async function GET(request: NextRequest) {
  try {
    // Test wormhole connection
    const systemState = await wormholeService.getSystemState();

    return NextResponse.json({
      status: 'success',
      message: 'Wormhole endpoint operational',
      systemHealth: systemState.health?.overall || 'unknown',
      readyForCommands: systemState.health?.overall === 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Wormhole status check failed:', error);

    return NextResponse.json({
      status: 'error',
      message: 'Wormhole status check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
