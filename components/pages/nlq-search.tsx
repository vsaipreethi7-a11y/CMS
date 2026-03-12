'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search, Loader2, Brain, Target, Sparkles, Clock, FileText,
  Zap, Filter, X, RefreshCw, ArrowRight, Database, Globe,
  TrendingUp, Hash, Calendar, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CMSConnection, ContentItem, QueryHistory } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NLQSearchProps {
  connections: CMSConnection[];
  content: ContentItem[];
  queryHistory: QueryHistory[];
  onSearch: (query: string) => Promise<{ matches: { id: string; reason: string }[]; summary: string }>;
  onAddQueryToHistory: (query: string, resultCount: number) => void;
  isGroqConfigured: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const EXAMPLE_QUERIES = [
  { label: 'Draft posts', icon: '📝' },
  { label: 'Published WordPress content', icon: '🌐' },
  { label: 'Posts without tags', icon: '🏷️' },
  { label: 'Recent articles this week', icon: '📅' },
  { label: 'Content by John Smith', icon: '👤' },
  { label: 'Most detailed content', icon: '📖' },
];

export function NLQSearch({ connections, content, queryHistory, onSearch, onAddQueryToHistory, isGroqConfigured, showToast }: NLQSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [results, setResults] = useState<{ item: ContentItem; reason: string }[]>([]);
  const [summary, setSummary] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCMS, setSelectedCMS] = useState<string>('all');

  const filteredContent = useMemo(() =>
    selectedCMS === 'all' ? content : content.filter(c => c.cmsId === selectedCMS),
    [content, selectedCMS]
  );

  const filteredResults = useMemo(() =>
    selectedCMS === 'all' ? results : results.filter(r => r.item.cmsId === selectedCMS),
    [results, selectedCMS]
  );

  const getStatusColor = (status: ContentItem['status']) => {
    switch (status) {
      case 'published': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'draft': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'pending': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  const getCMSName = (cmsId: string) => connections.find(c => c.id === cmsId)?.name || 'Unknown';
  const getCMSType = (cmsId: string) => connections.find(c => c.id === cmsId)?.type || 'unknown';

  const getCMSColor = (type: string) => {
    switch (type) {
      case 'wordpress': return 'bg-blue-500/10 text-blue-400';
      case 'drupal': return 'bg-cyan-500/10 text-cyan-400';
      case 'joomla': return 'bg-orange-500/10 text-orange-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const STEPS = [
    { label: 'Parsing query with Groq AI…', icon: Brain },
    { label: `Scanning ${filteredContent.length} content items…`, icon: Database },
    { label: 'Ranking and formatting results…', icon: TrendingUp },
  ];

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    if (!isGroqConfigured) {
      showToast('Please configure your Groq API key first', 'error');
      return;
    }

    setQuery(searchQuery);
    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setSummary('');
    setStepIndex(0);

    try {
      await new Promise(r => setTimeout(r, 400));
      setStepIndex(1);
      await new Promise(r => setTimeout(r, 400));
      setStepIndex(2);

      const response = await onSearch(searchQuery);
      setStepIndex(3);

      const matched = response.matches
        .map(m => {
          const item = content.find(c => c.id === m.id);
          return item ? { item, reason: m.reason } : null;
        })
        .filter((m): m is { item: ContentItem; reason: string } => m !== null);

      setResults(matched);
      setSummary(response.summary);
      onAddQueryToHistory(searchQuery, matched.length);
    } catch {
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setIsSearching(false);
      setStepIndex(-1);
    }
  }, [isGroqConfigured, content, onSearch, onAddQueryToHistory, showToast, filteredContent.length]);

  const contentStats = useMemo(() => {
    const byStatus = { published: 0, draft: 0, pending: 0 };
    filteredContent.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
    return byStatus;
  }, [filteredContent]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            NLQ Search
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ask anything about your content in plain English — AI finds the matches
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-2 text-xs shrink-0">
          {[
            { label: 'Total', value: filteredContent.length, color: 'text-foreground' },
            { label: 'Published', value: contentStats.published, color: 'text-emerald-400' },
            { label: 'Drafts', value: contentStats.draft, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="px-3 py-2 bg-card border border-border rounded-xl text-center min-w-[60px]">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CMS Filter + Search box */}
      <div className="space-y-3">
        {connections.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCMS('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${selectedCMS === 'all' ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
            >
              All CMS ({content.length})
            </button>
            {connections.map(conn => (
              <button
                key={conn.id}
                onClick={() => setSelectedCMS(conn.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${selectedCMS === conn.id ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
              >
                {conn.name} ({content.filter(c => c.cmsId === conn.id).length})
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={e => { e.preventDefault(); handleSearch(query); }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. 'Show all draft WordPress posts without tags from last month'"
            className="w-full h-14 pl-12 pr-36 rounded-2xl bg-card border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            {hasSearched && (
              <button
                type="button"
                onClick={() => { setHasSearched(false); setResults([]); setSummary(''); setQuery(''); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Button type="submit" disabled={isSearching || !query.trim()} className="bg-primary text-white rounded-xl h-10 px-4 gap-2">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Search</>}
            </Button>
          </div>
        </form>
      </div>

      {/* Example chips */}
      {!hasSearched && !isSearching && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map(ex => (
            <button
              key={ex.label}
              onClick={() => handleSearch(ex.label)}
              disabled={isSearching}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <span>{ex.icon}</span> {ex.label}
            </button>
          ))}
        </div>
      )}

      {/* Step progress */}
      {isSearching && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-md mx-auto">
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500',
                  i < stepIndex ? 'bg-primary text-white' :
                  i === stepIndex ? 'bg-primary/20 text-primary' :
                  'bg-muted text-muted-foreground'
                )}>
                  {i < stepIndex ? (
                    <Sparkles className="w-4 h-4" />
                  ) : i === stepIndex ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={cn(
                  'text-sm transition-colors',
                  i < stepIndex ? 'text-muted-foreground line-through' :
                  i === stepIndex ? 'text-foreground font-medium' :
                  'text-muted-foreground'
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !isSearching && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* AI summary */}
          {summary && (
            <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary mb-1">AI INTERPRETATION</p>
                <p className="text-sm text-foreground">{summary}</p>
              </div>
            </div>
          )}

          {filteredResults.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-16 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
              <p className="text-muted-foreground text-sm">Try a broader query or sync more content from CMS Connections</p>
              <button
                onClick={() => handleSearch(query)}
                className="mt-4 flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{filteredResults.length}</span> match{filteredResults.length !== 1 ? 'es' : ''} found
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Scored by Groq · {new Date().toLocaleTimeString()}
                </p>
              </div>

              <div className="space-y-3">
                {filteredResults.map(({ item, reason }, idx) => (
                  <div
                    key={item.id}
                    className="group bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-2 leading-tight">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCMSColor(getCMSType(item.cmsId))}`}>
                            <Globe className="w-3 h-3 inline mr-1" />
                            {getCMSName(item.cmsId)}
                          </span>
                          {item.author && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" /> {item.author}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {format(new Date(item.date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="w-3 h-3" /> {item.wordCount.toLocaleString()} words
                          </span>
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/15 rounded-xl">
                          <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
                        </div>

                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Query history */}
      {queryHistory.length > 0 && !isSearching && !hasSearched && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Search History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {queryHistory.slice(0, 6).map(q => (
              <button
                key={q.id}
                onClick={() => handleSearch(q.query)}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-xl hover:border-primary/50 text-left transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{q.query}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-muted-foreground">{q.resultCount} results</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
