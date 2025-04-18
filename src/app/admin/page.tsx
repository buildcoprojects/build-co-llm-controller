// New admin page for mounting ChatPanel and signals

import ChatPanel from '@/components/ChatPanel';
import { Suspense } from 'react';
import { readSignalsBlob } from '@/lib/services/blob-service';

async function SignalsPanel() {
  const signals = await readSignalsBlob();
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xl mb-2 text-zinc-700 dark:text-zinc-300">Signals</h2>
      {signals.length === 0 && <div className="text-sm text-zinc-400">No signals yet.</div>}
      {signals.slice().reverse().map((signal: any, idx: number) => (
        <div key={idx} className="rounded bg-zinc-100 dark:bg-zinc-800 p-2 shadow text-xs">
          <pre className="whitespace-pre-line">{JSON.stringify(signal, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-screen">
      <div className="flex-1 bg-muted text-muted-foreground p-4 dark:bg-zinc-900 dark:text-zinc-100">
        <Suspense fallback={<div>Loading chat…</div>}>
          <ChatPanel />
        </Suspense>
      </div>
      <div className="w-full md:w-[400px] border-l bg-background p-4 max-h-screen overflow-y-auto">
        <Suspense fallback={<div>Loading signals…</div>}>
          <SignalsPanel />
        </Suspense>
      </div>
    </div>
  );
}
