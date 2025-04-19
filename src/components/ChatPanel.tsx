'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Upload, Loader2 } from 'lucide-react';
import { useMediaQuery } from 'usehooks-ts';
import { v4 as uuidv4 } from 'uuid';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import ReactMarkdown from 'react-markdown';
import 'highlight.js/styles/github-dark.css';

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: UploadedFile[];
  id?: string;
}

interface UploadedFile {
  url: string;
  name: string;
  mimetype: string;
  preview?: string;
  parsedText?: string;
}

const ALLOWED_TYPES = [
  'text/plain', 'application/json', 'application/pdf', 'text/markdown', 'text/yaml', 'image/png', 'image/jpeg', 'image/jpg'
];

const getBlobHistoryUrl = (sessionId: string) => `/api/blob/chat-history/${sessionId}.json`;

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sessionId, setSessionId] = useState('');

  // Setup session ID & chat history persistence
  useEffect(() => {
    let sid = window.localStorage.getItem('chatSessionId');
    if (!sid) {
      sid = uuidv4();
      window.localStorage.setItem('chatSessionId', sid);
    }
    setSessionId(sid);
    // Load chat history from blob on mount
    if (sid) {
      fetch(getBlobHistoryUrl(sid))
        .then(r => r.ok ? r.json() : [])
        .then(hist => {
          if (Array.isArray(hist)) setMessages(hist);
        })
        .catch(() => {});
    }
  }, []);

  // Handle panel close on mobile
  useEffect(() => {
    if (!open) setAttachedFiles([]);
  }, [open]);

  // Handler: Toggle chat panel
  const handleToggle = () => setOpen(v => !v);

  // Handler: Send message
  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    const myMsg: ChatMessage = { role: 'user', content: input, files: attachedFiles };
    setMessages(msg => [...msg, myMsg]);
    setInput('');
    setAttachedFiles([]);
    setPending(true);
    setStreamingMsg('');
    // Fetch last 6 messages for context
    const context = [...messages.slice(-6), myMsg];
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          history: messages.slice(-6),
          message: input,
          files: attachedFiles.map(f => ({
            url: f.url,
            name: f.name,
            mimetype: f.mimetype,
            extractedText: f.parsedText,
          })),
        })
      });
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      let assistantText = '';
      setStreamingMsg('');
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        assistantText += chunk;
        setStreamingMsg(assistantText);
      }
      setMessages(msgs => [...msgs, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      setStreamingMsg('Error getting response.');
    } finally {
      setPending(false);
    }
  };

  // Handler: File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const uploads: UploadedFile[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.status === 'success' && data.file) {
          let imgPreview = undefined;
          if (file.type.startsWith('image/')) {
            imgPreview = URL.createObjectURL(file);
          }
          uploads.push({
            url: data.file.url,
            name: file.name,
            mimetype: file.type,
            preview: imgPreview,
            parsedText: data.file.extractedText,
          });
        }
      } catch {
        // Optionally handle error
      }
    }
    setAttachedFiles(f => [...f, ...uploads]);
  };

  // Dark panel with framer-motion (responsive)
  return (
    <>
      {/* Toggle Button */}
      <button
        className="fixed top-4 left-4 z-40 bg-black/60 dark:bg-zinc-900 rounded-full p-2 shadow-lg"
        onClick={handleToggle}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <X className="text-white w-5 h-5" /> : <Menu className="text-white w-5 h-5" />}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            key="chatpanel"
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            className={`fixed z-50 left-0 top-0 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col
             ${isMobile ? 'w-screen' : 'w-96'} max-w-full shadow-2xl`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
                <span className="font-bold text-lg text-white">GPT Chat</span>
                <button onClick={handleToggle} className="p-1 bg-black/40 rounded hover:bg-black/60">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-900">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap
                  ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
                      {/* Markdown rendering */}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          code(props) {
                            const { children, className, ...rest } = props;
                            return <code className={className + ' text-xs px-1'} {...rest}>{children}</code>;
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {/* File preview (if any) */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.files.map((file, j) => (
                            <div key={file.url || file.name + j} className="text-xs">
                              {file.mimetype.startsWith('image/') ? (
                                <img src={file.url || file.preview} alt={file.name} className="max-h-24 rounded shadow" />
                              ) : file.mimetype === 'application/pdf' ? (
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                                  {file.name} (PDF)
                                </a>
                              ) : (
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">
                                  {file.name}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Streaming message text */}
                {pending && (
                  <div className="flex items-center text-zinc-200 mt-2 gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>{streamingMsg || 'GPT is typing...'}</span>
                  </div>
                )}
              </div>
              {/* Input Area */}
              <form
                className="flex flex-col gap-2 p-4 border-t border-zinc-800 bg-zinc-950"
                onSubmit={e => { e.preventDefault(); handleSend(); }}
                autoComplete="off"
              >
                {/* File Upload Button & Previews */}
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer">
                    <Upload className="w-5 h-5 text-zinc-400" />
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept={ALLOWED_TYPES.join(',')}
                      onChange={handleFileUpload}
                    />
                  </label>
                  {attachedFiles.map((file, i) => (
                    <span key={file.name + i} className="text-xs text-zinc-400 bg-zinc-800 rounded px-2 py-1 flex items-center">
                      {file.mimetype.startsWith('image/') ? (
                        <img src={file.preview || file.url} alt={file.name} className="h-6 w-6 object-contain mr-2 rounded" />
                      ) : null}
                      {file.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded bg-zinc-800 text-white px-3 py-2 focus:outline-none"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={pending}
                  />
                  <button
                    type="submit"
                    disabled={pending || (!input.trim() && attachedFiles.length === 0)}
                    className="ml-2 px-4 py-2 bg-blue-600 rounded text-white font-medium disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
