import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { wormholeService } from '@/lib/services/wormhole-service';

// Make sure we're using dynamic API routes
export const dynamic = "force-dynamic";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactEmail,
      nodeReference,
      leadType,
      orderSize,
      artifactName,
      artifactContent,
      interestType,
      wormholeMetadata
    } = body;

    // Check if this is a wormhole artefact request
    if (artifactContent && (wormholeMetadata || artifactContent.includes('WORMHOLE_PROTOCOL'))) {
      console.log('Processing wormhole artefact...');
      const wormholeResult = await wormholeService.processArtefact(
        artifactContent,
        {
          companyName,
          contactEmail,
          nodeReference,
          leadType,
          orderSize,
          artifactName,
          wormhole: true,
          ...wormholeMetadata
        }
      );

      // Return the wormhole processing result
      return NextResponse.json({
        status: wormholeResult.success ? 'success' : 'error',
        classification: wormholeResult.analysis?.classification || 'Wormhole',
        confidence: wormholeResult.analysis?.confidenceScore || 1.0,
        rationale: wormholeResult.analysis?.summary || 'Wormhole processing',
        wormholeResult
      });
    }

    // Normal classification flow for non-wormhole requests
    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required for classification' },
        { status: 400 }
      );
    }

    // Construct the prompt for GPT
    const prompt = `
    Analyze this LLM controller signal and classify it into one of these categories:
    - Suspicious: Signal that appears unusual or concerning
    - Confirmed: Signal that appears legitimate and ordinary
    - Needs-Mirror: Signal that might require duplication/mirroring

    Signal details:
    - Company: ${companyName}
    - Contact: ${contactEmail || 'N/A'}
    - Lead Type: ${leadType || 'Unknown'}
    - Node Reference: ${nodeReference || 'N/A'}
    - Order Size: $${orderSize || 0}
    - Artifact: ${artifactName || 'None'}
    - Interest in: ${Object.entries(interestType || {})
        .filter(([_, value]) => value === true)
        .map(([key]) => key)
        .join(', ') || 'None'}

    Please provide:
    1. Classification (exactly one of: Suspicious, Confirmed, Needs-Mirror)
    2. Confidence level (0.0-1.0)
    3. Brief rationale (1-2 sentences)

    Format response as JSON:
    {
      "classification": "Category",
      "confidence": 0.95,
      "rationale": "Reason for classification"
    }
    `;

    // Call OpenAI API with GPT-4o (upgraded from gpt-4o-mini)
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using more capable model
      messages: [
        {
          role: "system",
          content: "You are a signal classifier for Build Co LLM Controller. Your job is to analyze signals and classify them accurately."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '';

    try {
      const classification = JSON.parse(content);
      return NextResponse.json({
        status: 'success',
        classification: classification.classification,
        confidence: classification.confidence,
        rationale: classification.rationale
      });
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse classification result'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to classify signal with OpenAI' },
      { status: 500 }
    );
  }
}
