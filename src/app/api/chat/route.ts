import type { NextRequest } from 'next/server';
import { streamChatCompletion } from '@/lib/services/openai-service';
import { appendChatMessage, appendSignal } from '@/lib/services/blob-service';
// No import for wormhole-service yet, to wire artefact logic

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, files = [], artefact } = body;
    const prompt = message;
    const pdfText = '';

    // PDF parsing logic not wired yet (needs file uploading/parse route).
    // If files[] has a PDF, extract text via a utility route later.

    const userMsg = { role: 'user', content: prompt, files };

    await appendChatMessage(sessionId, userMsg);
    if (artefact) {
      await appendSignal({
        type: 'artefact',
        sessionId,
        artefact,
        ts: new Date().toISOString(),
      });
      // TODO: wormhole-service invoke
    }

    // Stream OpenAI response
    const stream = await streamChatCompletion({ messages: [userMsg] });
    // Return a text/event-stream for streaming
    return new Response(stream as any, { headers: { 'Content-Type': 'text/event-stream' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500 });
  }
}

console.log("[/api/chat] route.ts loaded and POST handler registered");
