import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2, RefreshCw, Trash2, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage, Product } from '../types';

interface AnalystChatProps {
  id: string;
  onSendMessage: (text: string) => Promise<string>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  selectedProduct: Product | null;
  onClearChat: () => void;
}

export const AnalystChat: React.FC<AnalystChatProps> = ({
  id,
  onSendMessage,
  messages,
  setMessages,
  selectedProduct,
  onClearChat,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    { label: '📊 Best categories summary', query: 'Which product categories are generating the maximum revenue? Give me a quick comparative breakdown of their metrics.' },
    { label: '⚠️ Underperforming products', query: 'Which items are underperforming? Please list the top 5 biggest underperforming products and why.' },
    { label: '📈 Promotion recommendations', query: 'Which products do you recommend for promotional packages or discount campaigns to optimize current inventory?' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    await handleSend(userText);
  };

  const handleSend = async (text: string) => {
    setLoading(true);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await onSendMessage(text);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `❌ Error communicating with AI Analyst: ${err.message || 'Unknown network error. Please verify your GEMINI_API_KEY secret.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI Data Analyst</h3>
            <span className="text-[10px] text-emerald-600 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              Live Database Connected
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {messages.length > 1 && (
            <button
              onClick={onClearChat}
              title="Reset Chat Session"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Product Context Ticker */}
      {selectedProduct && (
        <div className="bg-violet-50/50 border-b border-violet-100 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-xs text-violet-700 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">Context: {selectedProduct.name}</span>
          </div>
          <span className="text-[9px] uppercase font-mono bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded">Active</span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-2.5 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  m.role === 'user'
                    ? 'bg-slate-200 text-slate-700'
                    : m.content.startsWith('❌')
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-violet-100 text-violet-700'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div>
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-slate-800 text-white rounded-tr-none'
                      : m.content.startsWith('❌')
                      ? 'bg-rose-50 border border-rose-100 text-rose-800 rounded-tl-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50'
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[9px] text-slate-400 block mt-1 px-1 text-right">
                  {m.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2.5 max-w-[85%]">
              <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 border border-slate-200/50 p-3.5 rounded-2xl rounded-tl-none">
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[10px] text-slate-500 font-medium ml-1">Analyzing database...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions (Only when conversation is fresh) */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 py-2 border-t border-slate-50 shrink-0 bg-slate-50/40">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quick Analyst Queries</p>
          <div className="flex flex-col gap-1">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q.query)}
                className="w-full text-left text-[11px] text-slate-600 hover:text-violet-700 hover:bg-violet-50/50 p-1.5 rounded-md border border-slate-100 transition-all font-medium truncate cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedProduct ? `Ask about "${selectedProduct.name}"...` : "Ask AI analyst anything..."}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-violet-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:hover:bg-slate-800 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
