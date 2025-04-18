import { put, get, list, append } from '@netlify/blobs';

const SIGNALS_PATH = 'data/signals.json';
const CHAT_HISTORY_PREFIX = 'chat-history/';

export async function ensureSignalsBlob() {
  try {
    const sig = await get(SIGNALS_PATH);
    if (!sig) {
      await put(SIGNALS_PATH, JSON.stringify([]), { contentType: 'application/json' });
    }
  } catch {
    await put(SIGNALS_PATH, JSON.stringify([]), { contentType: 'application/json' });
  }
}

export async function readSignalsBlob() {
  await ensureSignalsBlob();
  const res = await get(SIGNALS_PATH);
  if (!res) return [];
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch { return []; }
}

export async function appendSignal(payload: any) {
  await ensureSignalsBlob();
  const arr = await readSignalsBlob();
  arr.push(payload);
  await put(SIGNALS_PATH, JSON.stringify(arr, null, 2), { contentType: 'application/json' });
}

export async function ensureChatHistory(sessionId: string) {
  const path = `${CHAT_HISTORY_PREFIX}${sessionId}.json`;
  try {
    const res = await get(path);
    if (!res) {
      await put(path, JSON.stringify([]), { contentType: 'application/json' });
    }
  } catch {
    await put(path, JSON.stringify([]), { contentType: 'application/json' });
  }
}

export async function readChatHistory(sessionId: string) {
  await ensureChatHistory(sessionId);
  const path = `${CHAT_HISTORY_PREFIX}${sessionId}.json`;
  const res = await get(path);
  if (!res) return [];
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch { return []; }
}

export async function appendChatMessage(sessionId: string, msg: any) {
  await ensureChatHistory(sessionId);
  const path = `${CHAT_HISTORY_PREFIX}${sessionId}.json`;
  const arr = await readChatHistory(sessionId);
  arr.push(msg);
  await put(path, JSON.stringify(arr, null, 2), { contentType: 'application/json' });
}
