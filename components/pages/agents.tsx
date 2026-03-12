'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Bot, Link2, Zap, BarChart3, Play, RefreshCw,
  CheckCircle, AlertCircle, Loader2, ChevronDown,
  ChevronRight, FileText, ExternalLink, Hash,
  TrendingUp, AlertTriangle, Info, Sparkles,
  Globe, Clock, BookOpen, Database, Settings2,
  List, Grid3X3, ArrowRight, Image as ImageIcon, Users, Layers
} from 'lucide-react';
import { useGroq } from '@/hooks/use-groq';
import { useCMS } from '@/hooks/use-cms';
import type { CMSConnection, CMSType } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DataTab = 'posts' | 'media' | 'users' | 'custom' | 'ai_link' | 'ai_hyper' | 'ai_km';
type AgentStatus = 'idle' | 'running' | 'success' | 'error';
type ViewMode = 'table' | 'grid';

interface AgentResult {
  cms: CMSType;
  siteUrl: string;
  data: Record<string, any>;
  fetchedAt: string;
}

interface LinkOpportunity {
  phrase: string;
  suggestedUrl: string;
  targetTitle: string;
  relevanceScore: number;
  context: string;
}

interface LinkDiscoveryResult {
  contentId: string;
  contentTitle: string;
  pageTitle: string;
  pageSummary: string;
  orphanRisk: 'low' | 'medium' | 'high';
  totalOpportunities: number;
  opportunities: LinkOpportunity[];
}

interface HyperlinkResult {
  contentId: string;
  contentTitle: string;
  originalWordCount: number;
  linksInjected: number;
  linkDensity: number;
  processedHtml: string;
  linkMap: { phrase: string; url: string; title: string }[];
}

interface KMMetric {
  label: string;
  score: number;
  insight: string;
}

interface KMResult {
  contentId: string;
  contentTitle: string;
  overallKMScore: number;
  metrics: KMMetric[];
  knowledgeGaps: string[];
  topTopics: string[];
  recommendations: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CMS_CONFIGS: Record<CMSType, { color: string; accentColor: string; icon: string; endpoint: string }> = {
  wordpress: { color: '#21759B', accentColor: '#00A0D2', icon: 'WP', endpoint: '/api/agents/wordpress' },
  drupal: { color: '#0077C0', accentColor: '#009DDB', icon: 'DR', endpoint: '/api/agents/drupal' },
  joomla: { color: '#F4460F', accentColor: '#FF6B35', icon: 'JM', endpoint: '/api/agents/joomla' },
};

const DATA_TABS: { key: DataTab; label: string; icon: React.ReactNode; wpKey: string[]; drupalKey: string[]; joomlaKey: string[] }[] = [
  { key: 'posts', label: 'Posts & Pages', icon: <FileText className="w-4 h-4" />, wpKey: ['posts', 'pages'], drupalKey: ['articles', 'pages'], joomlaKey: ['articles'] },
  { key: 'media', label: 'Media & Assets', icon: <ImageIcon className="w-4 h-4" />, wpKey: ['media'], drupalKey: ['media'], joomlaKey: ['media'] },
  { key: 'users', label: 'Users & Authors', icon: <Users className="w-4 h-4" />, wpKey: ['users'], drupalKey: ['users'], joomlaKey: ['users'] },
  { key: 'custom', label: 'Custom Types', icon: <Layers className="w-4 h-4" />, wpKey: ['customTypes', 'customTypeItems'], drupalKey: ['contentTypes'], joomlaKey: ['categories', 'components'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDataForTab(result: AgentResult, tab: DataTab): Record<string, any> {
  const tabConfig = DATA_TABS.find(t => t.key === tab);
  if (!tabConfig) return {};
  const keysMap: Record<CMSType, string[]> = {
    wordpress: tabConfig.wpKey,
    drupal: tabConfig.drupalKey,
    joomla: tabConfig.joomlaKey,
  };
  const keys = keysMap[result.cms];
  const out: Record<string, any> = {};
  for (const k of keys) {
    if (result.data[k] !== undefined) out[k] = result.data[k];
  }
  return out;
}

function flattenItems(data: Record<string, any>): any[] {
  const items: any[] = [];
  for (const val of Object.values(data)) {
    if (Array.isArray(val)) items.push(...val);
    else if (val && typeof val === 'object') {
      const d = (val as any).data;
      if (Array.isArray(d)) items.push(...d);
      else if (d) items.push(d);
    }
  }
  return items;
}

function extractLabel(item: any, cms: CMSType): string {
  if (!item || typeof item !== 'object') return 'Unknown';
  if (item.title && typeof item.title === 'object') {
    return item.title.rendered || 'Untitled';
  }
  if (typeof item.title === 'string') return item.title;
  if (typeof item.name === 'string') return item.name;
  if (item.attributes?.title) return item.attributes.title;
  if (item.attributes?.name) return item.attributes.name;
  return String(item.id || item.name || 'Item');
}

function extractMeta(item: any, cms: CMSType): { status?: string; date?: string; author?: string; type?: string } {
  if (!item || typeof item !== 'object') return {};
  const attrs = (item.attributes || item) as any;
  return {
    status: attrs.status || attrs.state,
    date: attrs.date || attrs.created || attrs.date_published,
    author: typeof attrs.author === 'string' ? attrs.author : undefined,
    type: attrs.type || item.type,
  };
}

// ─── Small UI Helpers ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: AgentStatus }) {
  const map = {
    idle: { cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/40', label: 'Idle' },
    running: { cls: 'bg-primary/10 text-primary', dot: 'bg-primary animate-pulse', label: 'Running' },
    success: { cls: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400', label: 'Done' },
    error: { cls: 'bg-destructive/10 text-destructive', dot: 'bg-destructive', label: 'Error' },
  }[status];
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  const map: Record<string, string> = {
    publish: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    '1': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    draft: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    '0': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    private: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    trash: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = map[s] || 'bg-muted text-muted-foreground border-border';
  const label = { '1': 'published', '0': 'draft' }[s] || s;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Result Components ────────────────────────────────────────────────────────

function ItemCard({ item, cms, viewMode }: { item: any; cms: CMSType; viewMode: ViewMode }) {
  const [expanded, setExpanded] = useState(false);
  const label = extractLabel(item, cms);
  const meta = extractMeta(item, cms);

  if (viewMode === 'grid') {
    return (
      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">{label}</p>
          <StatusBadge status={meta.status} />
        </div>
        {meta.date && <p className="text-xs text-muted-foreground mt-1">{new Date(meta.date).toLocaleDateString()}</p>}
        {meta.author && <p className="text-xs text-muted-foreground">By {meta.author}</p>}
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary/70 hover:text-primary mt-2 flex items-center gap-1">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? 'Hide' : 'Raw JSON'}
        </button>
        {expanded && <pre className="mt-2 p-2 bg-background rounded-lg text-[10px] overflow-auto max-h-32 border border-border">{JSON.stringify(item, null, 2)}</pre>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {meta.date && <p className="text-xs text-muted-foreground">{new Date(meta.date).toLocaleDateString()}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meta.author && <span className="text-xs text-muted-foreground hidden sm:block">{meta.author}</span>}
        <StatusBadge status={meta.status} />
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>
      {expanded && <div className="absolute left-0 right-0 z-10 mx-4 mt-1"><pre className="p-3 bg-card border border-border shadow-xl rounded-xl text-[10px] overflow-auto max-h-48">{JSON.stringify(item, null, 2)}</pre></div>}
    </div>
  );
}

function DataSection({ result, activeTab, viewMode }: { result: AgentResult; activeTab: DataTab; viewMode: ViewMode }) {
  const sectionData = getDataForTab(result, activeTab);
  const items = flattenItems(sectionData);
  const hasError = Object.values(sectionData).some(v => v && typeof v === 'object' && (v as any).error);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-destructive">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm font-medium">Fetch Error</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Database className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm">No items found in this category</p>
      </div>
    );
  }

  return (
    <div className={viewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 gap-3 p-4' : 'divide-y divide-border/50'}>
      {items.map((item, i) => <ItemCard key={i} item={item} cms={result.cms} viewMode={viewMode} />)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AgentsProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  connections: CMSConnection[];
}

export function Agents({ showToast, connections }: AgentsProps) {
  const { content } = useCMS();
  const { completeJSON } = useGroq();

  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<DataTab>('posts');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Status & Results
  const [fetchStatus, setFetchStatus] = useState<Record<string, AgentStatus>>({});
  const [fetchResults, setFetchResults] = useState<Record<string, AgentResult>>({});
  
  const [linkStatus, setLinkStatus] = useState<AgentStatus>('idle');
  const [linkResults, setLinkResults] = useState<LinkDiscoveryResult[]>([]);

  const activeConnection = useMemo(() => connections.find(c => c.id === selectedConnId), [connections, selectedConnId]);
  const currentFetchResult = selectedConnId ? fetchResults[selectedConnId] : null;

  // 1. Fetch live data
  const runFetchAgent = useCallback(async () => {
    if (!activeConnection) return;
    setFetchStatus(prev => ({ ...prev, [selectedConnId]: 'running' }));
    const cfg = CMS_CONFIGS[activeConnection.type];

    try {
      let body: Record<string, string> = { siteUrl: activeConnection.url, dataType: 'all' };
      if (activeConnection.type === 'wordpress' || activeConnection.type === 'drupal') {
        const [user, pwd] = activeConnection.apiKey.includes(':') ? activeConnection.apiKey.split(':') : ['admin', activeConnection.apiKey];
        body.username = user;
        body[activeConnection.type === 'wordpress' ? 'appPassword' : 'password'] = pwd;
      } else {
        body.apiToken = activeConnection.apiKey;
      }

      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFetchResults(prev => ({ ...prev, [selectedConnId]: data }));
      setFetchStatus(prev => ({ ...prev, [selectedConnId]: 'success' }));
      showToast('Live connection verified and data fetched!', 'success');
    } catch (err) {
      setFetchStatus(prev => ({ ...prev, [selectedConnId]: 'error' }));
      showToast(`Fetch failed: ${String(err)}`, 'error');
    }
  }, [selectedConnId, activeConnection, showToast]);

  // 2. AI Agents running on local content
  const runLinkDiscovery = useCallback(async () => {
    if (!selectedConnId) return;
    const cmsContent = content.filter(c => c.cmsId === selectedConnId);
    if (cmsContent.length === 0) {
      showToast('No content found in local library. Load sample content first.', 'error');
      return;
    }
    setLinkStatus('running');
    try {
      const results: LinkDiscoveryResult[] = [];
      for (const item of cmsContent.slice(0, 3)) {
        const otherTitles = cmsContent.filter(c => c.id !== item.id).map(c => c.title);
        const res = await completeJSON<LinkDiscoveryResult>(
          `Analyze internal links for: "${item.title}". Targets: ${JSON.stringify(otherTitles)}. Item Body: ${item.body.substring(0, 500)}`,
          'You are an SEO expert. Return JSON.'
        );
        if (res) results.push(res);
      }
      setLinkResults(results);
      setLinkStatus('success');
      setActiveTab('ai_link');
    } catch (err) {
      setLinkStatus('error');
      showToast('AI analysis failed', 'error');
    }
  }, [selectedConnId, content, completeJSON, showToast]);

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20"><Bot className="w-6 h-6 text-primary" /></div>
            CMS Content Agents
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Select a connection to fetch live data or run AI analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {connections.map(conn => (
          <button
            key={conn.id}
            onClick={() => setSelectedConnId(conn.id)}
            className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${selectedConnId === conn.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card'}`}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: CMS_CONFIGS[conn.type]?.color || '#888' }}>
              {CMS_CONFIGS[conn.type]?.icon || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{conn.name}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                <StatusPill status={fetchStatus[conn.id] || 'idle'} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Settings2 className="w-4 h-4" /> Operations</h3>
            {!activeConnection ? (
              <p className="text-xs text-muted-foreground text-center">Select a CMS to start</p>
            ) : (
              <>
                <button
                  onClick={runFetchAgent}
                  disabled={fetchStatus[selectedConnId] === 'running'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-primary text-white hover:opacity-90 transition-all"
                >
                  {fetchStatus[selectedConnId] === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Fetch Live Content
                </button>
                <div className="pt-2 border-t border-border space-y-2">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">AI Intelligent Agents</p>
                   <button
                    onClick={runLinkDiscovery}
                    disabled={linkStatus === 'running'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-primary" /> Internal Link Discovery
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl flex flex-col min-h-[500px]">
          {activeConnection ? (
            <>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/5 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> {activeConnection.name}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-primary/20 text-primary' : ''}`}><List className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : ''}`}><Grid3X3 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex border-b border-border bg-card overflow-x-auto no-scrollbar">
                {DATA_TABS.concat([
                  { key: 'ai_link', label: 'Link Insights', icon: <Sparkles className="w-4 h-4" />, wpKey: [], drupalKey: [], joomlaKey: [] }
                ] as any).map((tab: any) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-4 text-xs font-bold border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto bg-muted/5">
                {activeTab === 'ai_link' ? (
                  <div className="p-4 space-y-4">
                    {linkResults.map((r, i) => (
                      <div key={i} className="bg-card border border-border p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-foreground">{r.contentTitle}</h4>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{r.orphanRisk} risk</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{r.pageSummary}</p>
                        <div className="space-y-2">
                          {r.opportunities.map((op, oi) => (
                            <div key={oi} className="text-[11px] p-2 bg-muted/40 rounded border border-border/40 flex justify-between">
                              <span>Link <strong>&quot;{op.phrase}&quot;</strong> to <em>{op.targetTitle}</em></span>
                              <span className="text-primary font-bold">{(op.relevanceScore * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {linkResults.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No AI Link Discovery data. Run the agent!</p>}
                  </div>
                ) : currentFetchResult ? (
                  <DataSection result={currentFetchResult} activeTab={activeTab} viewMode={viewMode} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-20 text-center opacity-50">
                    <Zap className="w-12 h-12 mb-4" />
                    <p>Live data not yet fetched for this site.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <Bot className="w-16 h-16 opacity-10 mb-4" />
              <p>Select a CMS Connection from the list above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}