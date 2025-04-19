import ChatPanel from '@/components/ChatPanel';
import { Layout } from '@/components/layout';

export default function ChatPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-10">
        <h1 className="text-2xl font-bold mb-6">Chat Panel</h1>
        <div className="w-full max-w-2xl bg-background border rounded-lg shadow-lg">
          <ChatPanel />
        </div>
      </div>
    </Layout>
  );
}
