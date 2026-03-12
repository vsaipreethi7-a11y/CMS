'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Trash2, Sparkles, FileText, Wand2,
  MessageSquare, PenTool, Languages, CheckCircle2, Zap,
  Copy, RotateCcw, Loader2, ChevronRight, Globe, Hash,
  BookOpen, Lightbulb, Code2, Mic, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CMSConnection, ContentItem } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: string;
}

type LLMMode = 'chat' | 'summarize' | 'rewrite' | 'translate' | 'generate' | 'analyze';

interface LLMStudioProps {
  connections: CMSConnection[];
  content: ContentItem[];
  isGroqConfigured: boolean;
  onLLMRequest: (prompt: string, systemPrompt: string, mode: LLMMode) => Promise<string>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const MODES: { id: LLMMode; label: string; icon: React.ElementType; description: string; color: string; accent: string }[] = [
  { id: 'chat',       label: 'Chat',       icon: MessageSquare, description: 'Conversational content assistant', color: '#6366F1', accent: 'rgba(99,102,241,0.12)' },
  { id: 'summarize',  label: 'Summarize',  icon: FileText,      description: 'Condense into key points',        color: '#06B6D4', accent: 'rgba(6,182,212,0.12)' },
  { id: 'rewrite',    label: 'Rewrite',    icon: PenTool,       description: 'Improve or rephrase content',    color: '#8B5CF6', accent: 'rgba(139,92,246,0.12)' },
  { id: 'translate',  label: 'Translate',  icon: Languages,     description: 'Translate to any language',      color: '#10B981', accent: 'rgba(16,185,129,0.12)' },
  { id: 'generate',   label: 'Generate',   icon: Sparkles,      description: 'Create new content on demand',   color: '#F59E0B', accent: 'rgba(245,158,11,0.12)' },
  { id: 'analyze',    label: 'Analyze',    icon: Zap,           description: 'SEO, readability & sentiment',   color: '#EF4444', accent: 'rgba(239,68,68,0.12)' },
];

const QUICK_PROMPTS: Record<LLMMode, { label: string; icon: React.ElementType }[]> = {
  chat: [
    { label: 'What content is outdated?', icon: Globe },
    { label: 'Summarize all draft posts', icon: FileText },
    { label: 'Suggest content topics', icon: Lightbulb },
    { label: 'Find content about AI', icon: Hash },
  ],
  summarize: [
    { label: 'Bullet point summary', icon: BookOpen },
    { label: 'One paragraph only', icon: FileText },
    { label: 'Executive summary', icon: Shield },
    { label: 'Key takeaways', icon: CheckCircle2 },
  ],
  rewrite: [
    { label: 'Make it professional', icon: Shield },
    { label: 'Simplify for beginners', icon: Lightbulb },
    { label: 'More engaging tone', icon: Sparkles },
    { label: 'Shorten by 50%', icon: Code2 },
  ],
  translate: [
    { label: 'Translate to Spanish', icon: Globe },
    { label: 'Translate to French', icon: Globe },
    { label: 'Translate to German', icon: Globe },
    { label: 'Translate to Japanese', icon: Globe },
  ],
  generate: [
    { label: 'Write a blog intro', icon: PenTool },
    { label: 'Social media captions', icon: Mic },
    { label: 'Meta description', icon: Hash },
    { label: 'Email newsletter', icon: FileText },
  ],
  analyze: [
    { label: 'SEO analysis', icon: Globe },
    { label: 'Readability score', icon: BookOpen },
    { label: 'Sentiment analysis', icon: Lightbulb },
    { label: 'Extract keywords', icon: Hash },
  ],
};

const SYSTEM_PROMPTS: Record<LLMMode, string> = {
  chat: 'You are an AI assistant for a multi-CMS platform called CMS Nexus. Help users understand their content, find improvements, and provide insights. Be concise and helpful.',
  summarize: 'You are a professional content summarizer. Condense text into clear summaries preserving key information. Format your response appropriately.',
  rewrite: 'You are a professional content editor. Improve the provided text per the user\'s instructions while maintaining meaning. Focus on clarity and engagement.',
  translate: 'You are a professional translator. Translate text accurately while maintaining original tone and style. Preserve formatting where possible.',
  generate: 'You are a creative content writer for CMS platforms. Generate high-quality, engaging content based on user requirements.',
  analyze: 'You are a content analysis expert. Analyze text and give insights including SEO, readability, sentiment, and keywords. Format clearly with sections.',
};

export function LLMStudio({ connections, content, isGroqConfigured, onLLMRequest, showToast }: LLMStudioProps) {
  const [mode, setMode] = useState<LLMMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { setMessages([]); setSelectedContent(null); }, [mode]);

  const currentMode = MODES.find(m => m.id === mode)!;

  const buildPrompt = useCallback((userInput: string) => {
    if (mode === 'chat') {
      const ctx = content.slice(0, 20).map(c => ({ id: c.id, title: c.title, status: c.status, author: c.author, tags: c.tags, wordCount: c.wordCount }));
      const cms = connections.map(c => ({ id: c.id, name: c.name, type: c.type }));
      return `CMS: ${JSON.stringify(cms)}\nContent: ${JSON.stringify(ctx)}\n\nUser: ${userInput}`;
    }
    if (selectedContent) {
      return `Content Title: "${selectedContent.title}"\n\nContent Body:\n${selectedContent.body}\n\nInstruction: ${userInput}`;
    }
    return userInput;
  }, [mode, content, connections, selectedContent]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    if (!isGroqConfigured) { showToast('Configure your Groq API key first', 'error'); return; }

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: new Date(), mode }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await onLLMRequest(buildPrompt(msg), SYSTEM_PROMPTS[mode], mode);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: new Date(), mode }]);
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to get response'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isGroqConfigured, buildPrompt, onLLMRequest, mode, showToast]);

  const copyMsg = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    showToast('Copied!', 'success');
  };

  const regenerate = async () => {
    if (messages.length < 2) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) { setMessages(prev => prev.slice(0, -1)); handleSend(lastUser.content); }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-5">
      {/* LEFT: Mode Sidebar */}
      <div className="w-[220px] shrink-0 flex flex-col gap-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">Mode</p>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border',
              mode === m.id
                ? 'border-[color:var(--accent-border)] text-foreground shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
            style={mode === m.id ? ({ background: m.accent, '--accent-border': m.color + '40' } as any) : {}}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: mode === m.id ? m.color + '25' : 'var(--muted)', color: mode === m.id ? m.color : undefined }}
            >
              <m.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-none">{m.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{m.description}</p>
            </div>
            {mode === m.id && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: m.color }} />}
          </button>
        ))}

        <div className="mt-auto pt-4 border-t border-border space-y-2">
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs', isGroqConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
            <span className={cn('w-2 h-2 rounded-full', isGroqConfigured ? 'bg-emerald-500' : 'bg-red-500')} />
            {isGroqConfigured ? 'Groq Connected' : 'Not Connected'}
          </div>
          <div className="px-3 py-2 bg-muted rounded-xl text-xs text-muted-foreground">
            {connections.length} CMS · {content.length} items
          </div>
        </div>
      </div>

      {/* RIGHT: Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: currentMode.accent }}>
              <currentMode.icon className="w-5 h-5" style={{ color: currentMode.color }} />
            </div>
            <div>
              <h2 className="font-bold text-foreground leading-none">{currentMode.label} Mode</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{currentMode.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {messages.length > 1 && (
              <Button variant="outline" size="sm" onClick={regenerate} disabled={isLoading}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
              </Button>
            )}
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { setMessages([]); setSelectedContent(null); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Content selector for non-chat modes */}
        {mode !== 'chat' && (
          <div className="mb-4 flex-shrink-0">
            <select
              value={selectedContent?.id || ''}
              onChange={e => setSelectedContent(content.find(c => c.id === e.target.value) || null)}
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">↑ Select a content item to process (or type below)</option>
              {content.map(c => (
                <option key={c.id} value={c.id}>{c.title} — {c.status}</option>
              ))}
            </select>
            {selectedContent && (
              <div className="mt-2 px-4 py-2 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground line-clamp-2">
                {selectedContent.body.substring(0, 200)}…
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                  style={{ background: currentMode.accent }}
                >
                  <currentMode.icon className="w-8 h-8" style={{ color: currentMode.color }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{currentMode.label} Mode</h3>
                <p className="text-muted-foreground text-sm max-w-xs mb-8">{currentMode.description} — try a quick prompt below</p>

                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {QUICK_PROMPTS[mode].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p.label)}
                      disabled={!isGroqConfigured || isLoading}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted hover:border-primary/30 transition-all text-left disabled:opacity-40"
                    >
                      <div className="p-1 rounded-lg" style={{ background: currentMode.accent }}>
                        <p.icon className="w-3.5 h-3.5" style={{ color: currentMode.color }} />
                      </div>
                      <span className="text-xs text-foreground font-medium leading-tight">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: currentMode.accent }}>
                        <Bot className="w-4 h-4" style={{ color: currentMode.color }} />
                      </div>
                    )}

                    <div className="max-w-[75%] group">
                      <div className={cn(
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className={cn('flex items-center gap-2 mt-1 px-1', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <span className="text-[10px] text-muted-foreground">{msg.timestamp.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => copyMsg(msg.id, msg.content)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                          >
                            {copied === msg.id
                              ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              : <Copy className="w-3 h-3 text-muted-foreground" />
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: currentMode.accent }}>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: currentMode.color }} />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentMode.color, animationDelay: `${i*0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 flex-shrink-0">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={
                  !isGroqConfigured ? 'LLM not connected. Check Settings.' :
                  mode === 'chat' ? 'Ask anything about your content...' :
                  `Type your ${currentMode.label.toLowerCase()} instruction...`
                }
                disabled={!isGroqConfigured || isLoading}
                rows={1}
                className="flex-1 resize-none bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 min-h-[48px] max-h-[120px]"
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || !isGroqConfigured || isLoading}
                className="h-12 w-12 rounded-xl shrink-0"
                style={{ background: isLoading ? undefined : currentMode.color }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
