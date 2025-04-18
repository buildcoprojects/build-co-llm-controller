import { OpenAIResponse } from '../types';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function classifySignal(
  text: string,
  metadata?: Record<string, unknown>
): Promise<OpenAIResponse> {
  try {
    if (!text) {
      return {
        success: false,
        message: 'Invalid input',
        error: 'Text content is required for classification',
      };
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    let classification = 'STANDARD';
    let confidenceScore = 0.75;
    let analysis = 'Standard signal with no special characteristics detected.';

    const textLower = text.toLowerCase();
    if (textLower.includes('urgent') || textLower.includes('important') || textLower.includes('critical')) {
      classification = 'HIGH_PRIORITY';
      confidenceScore = 0.92;
      analysis = 'High priority signal detected based on urgency keywords.';
    } else if (textLower.includes('payment') || textLower.includes('invoice')) {
      classification = 'PAYMENT';
      confidenceScore = 0.88;
      analysis = 'Payment-related signal detected.';
    } else if (textLower.includes('mirror') || textLower.includes('duplicate') || textLower.includes('copy')) {
      classification = 'MIRROR_NEEDED';
      confidenceScore = 0.85;
      analysis = 'Signal requires mirroring based on content.';
    } else if (textLower.includes('secure') || textLower.includes('confidential') || textLower.includes('private')) {
      classification = 'SECURED';
      confidenceScore = 0.95;
      analysis = 'Secure/confidential content detected.';
    }

    return {
      success: true,
      message: 'Signal classified successfully',
      data: {
        classification,
        confidenceScore,
        analysis,
      }
    };
  } catch (error) {
    console.error('Error classifying with OpenAI:', error);
    return {
      success: false,
      message: 'Failed to classify signal',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function analyzeArtefact(
  fileName: string,
  contentSummary: string
): Promise<OpenAIResponse> {
  try {
    if (!fileName || !contentSummary) {
      return {
        success: false,
        message: 'Invalid input',
        error: 'File name and content summary are required',
      };
    }

    await new Promise(resolve => setTimeout(resolve, 1200));

    const fileExt = fileName.split('.').pop()?.toLowerCase();
    let classification = 'STANDARD';
    let confidenceScore = 0.8;
    let analysis = 'Standard document with no special characteristics.';

    if (fileExt === 'pdf') {
      classification = 'DOCUMENTATION';
      analysis = 'PDF document detected, likely contains formal documentation.';
    } else if (fileExt === 'yaml' || fileExt === 'yml') {
      classification = 'CONFIGURATION';
      confidenceScore = 0.95;
      analysis = 'YAML configuration file detected, likely contains system parameters.';
    } else if (fileExt === 'json') {
      classification = 'DATA';
      confidenceScore = 0.9;
      analysis = 'JSON data file detected, containing structured data.';
    }

    const summaryLower = contentSummary.toLowerCase();
    if (summaryLower.includes('password') || summaryLower.includes('secret') || summaryLower.includes('key')) {
      classification = 'HIGH_RISK';
      confidenceScore = 0.98;
      analysis = 'CAUTION: File may contain sensitive information like passwords or keys.';
    }

    return {
      success: true,
      message: 'Artefact analyzed successfully',
      data: {
        classification,
        confidenceScore,
        analysis,
      }
    };
  } catch (error) {
    console.error('Error analyzing artefact with OpenAI:', error);
    return {
      success: false,
      message: 'Failed to analyze artefact',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function streamChatCompletion({
  messages,
  systemPrompt
}: {
  messages: any[];
  systemPrompt?: string;
}) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
    max_tokens: 4096,
    temperature: 0.5,
  });
  return stream;
}
