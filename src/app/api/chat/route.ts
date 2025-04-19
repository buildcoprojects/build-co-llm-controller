import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { blobService } from '@/lib/services/blob-service';

const useDeepseek = process.env.DEFAULT_LLM === 'deepseek';
const openai = useDeepseek
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1', // or correct DeepSeek endpoint
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

const WORMHOLE_BRIDGE_COMMAND = {
  command: 'diagnose',
  target: 'netlify-build',
  artefact: 'wormhole-same-bridge-init.yaml',
};
const WORMHOLE_ARTEFACT_URL = 'https://build-co-llm-controller.netlify.app/artefacts/wormhole-same-bridge-init.yaml';
const WORMHOLE_SHA3 = '2e75bfbc44f6ae21a7b7a8779cb554e61ddf58a0134de084d0bdee4b2b8d1a3d';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, history = [], message, files = [] } = body;

    // Passive wormhole bridge detection
    let tryBridge;
    try {
      tryBridge = typeof message === 'object' ? message : JSON.parse(message);
    } catch { tryBridge = null; }
    if (
      tryBridge &&
      tryBridge.command === WORMHOLE_BRIDGE_COMMAND.command &&
      tryBridge.target === WORMHOLE_BRIDGE_COMMAND.target &&
      tryBridge.artefact === WORMHOLE_BRIDGE_COMMAND.artefact
    ) {
      // Stream back diagnostic and bridge-online marker
      // Fix: Use one template string with correct embedded values
      const diag = `**Wormhole Bridge**: :rocket: Online

- Artefact: [wormhole-same-bridge-init.yaml](${WORMHOLE_ARTEFACT_URL})
- SHA3-256: \`${WORMHOLE_SHA3}\`
- Netlify site: build-co-llm-controller.netlify.app
- Blobs/Signals: available
- GitHub: buildcoprojects/build-co-llm-controller

> Ready for bi-directional wormhole commands. Passive mode. No infra mutation performed.
`;

      const enc = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(enc.encode(diag));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Context to send to GPT (last 6 msgs + system + extracted PDF if any)
    const context = history.slice(-6);
    let systemPrompt = 'You are BuildCo GPT-4o: Generate clear expert markdown. For code, reply with markdown code blocks.';
    let injectPdfText = '';

    // Inject extracted pdf text if user refers to PDF in files array
    const pdfFile = files.find((f:any) => f.mimetype === 'application/pdf' && f.extractedText);
    if (pdfFile && pdfFile.extractedText) {
      injectPdfText = `The user uploaded this PDF. Here is the extracted text:\n${pdfFile.extractedText.slice(0, 6000)}\n`;
    }

    // Messages to send (system prompt, PDF extract if any, history, user message)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(injectPdfText ? [{ role: 'system', content: injectPdfText }] : []),
    ...context,
    {
      role: 'user',
      content: typeof message === 'string' ? message : JSON.stringify(message)
    }
    ];

    // Prepare streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages
    });

    // Prepare to persist
    const store = blobService.getSignalsStore();
    const historyPath = `chat-history/${sessionId}.json`;
    let assistantContent = '';

    // Create a web stream for chunked reply
    const { readable, writable } = new TransformStream();
    (async () => {
      const writer = writable.getWriter();
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
          const part = chunk.choices[0].delta.content;
          assistantContent += part;
          await writer.write(part);
        }
      }
      await writer.close();
    })();

    // Save messages after stream complete
    readable.closed.then(async () => {
      let hist = [];
      try {
        hist = await store.getJSON(historyPath) || [];
      } catch (_) {}
      hist.push({ role: 'user', content: message, files });
      hist.push({ role: 'assistant', content: assistantContent });
      await store.setJSON(historyPath, hist.slice(-12)); // last 6 pairs
    });

    // Return streaming response
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return NextResponse.json({ status: 'error', message: err?.message || 'Failed', detail: String(err) }, { status: 500 });
  }
}
