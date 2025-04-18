// BEGIN Scaffold for ChatPanel UI (admin-only)
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPanel() {
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let sid = localStorage.getItem('chat-session-id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('chat-session-id', sid);
    }
    setSessionId(sid);
    // TODO: Load past session history from blob.
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files);
      setFiles(arr);
      // Preview first file if image or PDF
      if (arr[0] && arr[0].type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(arr[0]));
      } else if (arr[0] && arr[0].type === 'application/pdf') {
        setPreviewUrl('pdf-preview-selected'); // stub, implement viewer
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() && files.length === 0) return;
    setIsSending(true);
    // TODO: Send to /api/chat with files[]
    setMessages([...messages, { role: 'user', content: input, files }]);
    setInput('');
    setFiles([]);
    setPreviewUrl(null);
    // TODO: Stream assistant reply via SSE/fetch
    setTimeout(() => {
      setMessages(msgs => [...msgs, { role: 'assistant', content: 'AI response goes here.' }]);
      setIsSending(false);
    }, 1200);
  };

  return (
    <motion.div
      className="w-full max-w-xl bg-white dark:bg-zinc-900 border rounded-lg shadow-md flex flex-col"
      animate={{ x: collapsed ? '-90%' : '0%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <button
        className="absolute left-[-36px] top-2 z-10 rounded-full bg-zinc-700 text-white w-7 h-7 hover:bg-zinc-800"
        title={collapsed ? 'Open Chat' : 'Collapse Chat'}
        onClick={() => setCollapsed(x => !x)}
      >
        {collapsed ? '→' : '←'}
      </button>
      <div className="flex-1 flex flex-col space-y-2 p-4 overflow-y-auto">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`rounded-md px-4 py-2 mb-2 ${msg.role === 'user' ? 'bg-blue-50 dark:bg-zinc-800 self-end' : 'bg-zinc-100 dark:bg-zinc-700 self-start'}`}
            >
              {/* TODO: Add file preview if present */}
              <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </motion.div>
          ))}
          {isSending && (
            <motion.div className="rounded px-4 py-2 bg-zinc-100 dark:bg-zinc-700 self-start opacity-70 animate-pulse" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="tracking-widest">…</span> {/* Typing animation */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="border-t px-4 py-4 bg-zinc-50 dark:bg-zinc-800">
        <form
          className="flex flex-col gap-2"
          onSubmit={e => { e.preventDefault(); handleSend(); }}
        >
          {previewUrl && (
            <div className="mb-2">
              {/* File preview: image thumbnail or PDF icon */}
              {previewUrl === 'pdf-preview-selected'
                ? <span className="inline-block p-2 bg-gray-200 rounded">[PDF Preview]</span>
                : <img src={previewUrl} alt="preview" className="h-16 max-w-full object-contain rounded" />}
            </div>
          )}
          <input
            type="file"
            accept=".txt,.pdf,image/*"
            multiple
            onChange={handleFileChange}
            className="mb-1"
          />
          <div className="flex items-center gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message…"
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isSending}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-700"
              disabled={isSending || (!input.trim() && files.length === 0)}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
// END Scaffold
