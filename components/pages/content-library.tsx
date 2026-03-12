'use client';

import { useState, useMemo } from 'react';
import { Search, X, Sparkles, Tag, FileText, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CMSConnection, ContentItem } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContentLibraryProps {
  connections: CMSConnection[];
  content: ContentItem[];
  onUpdateContent: (id: string, updates: Partial<ContentItem>) => void;
  onSummarize: (content: ContentItem) => Promise<string>;
  onGenerateTags: (content: ContentItem) => Promise<string[]>;
  isGroqConfigured: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ContentLibrary({
  connections,
  content,
  onUpdateContent,
  onSummarize,
  onGenerateTags,
  isGroqConfigured,
  showToast
}: ContentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cmsFilter, setCmsFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'wordCount'>('date');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredContent = useMemo(() => {
    let result = [...content];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.author.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (cmsFilter !== 'all') {
      result = result.filter(c => c.cmsId === cmsFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'title': return a.title.localeCompare(b.title);
        case 'wordCount': return b.wordCount - a.wordCount;
        default: return 0;
      }
    });

    return result;
  }, [content, searchQuery, cmsFilter, statusFilter, sortBy]);

  const getCMSName = (cmsId: string) => {
    return connections.find(c => c.id === cmsId)?.name || 'Unknown';
  };

  const getCMSType = (cmsId: string) => {
    return connections.find(c => c.id === cmsId)?.type || 'unknown';
  };

  const getStatusColor = (status: ContentItem['status']) => {
    switch (status) {
      case 'published': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'draft': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'pending': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  const getCMSColor = (type: string) => {
    switch (type) {
      case 'wordpress': return 'bg-blue-500/20 text-blue-400';
      case 'drupal': return 'bg-cyan-500/20 text-cyan-400';
      case 'joomla': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleSummarize = async () => {
    if (!selectedContent || !isGroqConfigured) return;
    setIsLoadingSummary(true);
    setSummary('');
    try {
      const result = await onSummarize(selectedContent);
      setSummary(result);
    } catch (error) {
      showToast('Failed to generate summary', 'error');
    }
    setIsLoadingSummary(false);
  };

  const handleGenerateTags = async () => {
    if (!selectedContent || !isGroqConfigured) return;
    setIsLoadingTags(true);
    try {
      const tags = await onGenerateTags(selectedContent);
      onUpdateContent(selectedContent.id, { tags });
      setSelectedContent(prev => prev ? { ...prev, tags } : null);
      showToast('Tags generated successfully');
    } catch (error) {
      showToast('Failed to generate tags', 'error');
    }
    setIsLoadingTags(false);
  };

  const handleSaveTitle = () => {
    if (selectedContent && editingTitle.trim()) {
      onUpdateContent(selectedContent.id, { title: editingTitle.trim() });
      setSelectedContent(prev => prev ? { ...prev, title: editingTitle.trim() } : null);
      showToast('Title updated');
    }
  };

  const toggleStatus = () => {
    if (!selectedContent) return;
    const newStatus = selectedContent.status === 'published' ? 'draft' : 'published';
    onUpdateContent(selectedContent.id, { status: newStatus });
    setSelectedContent(prev => prev ? { ...prev, status: newStatus } : null);
    showToast(`Content ${newStatus === 'published' ? 'published' : 'unpublished'}`);
  };

  return (
    <div className="flex h-full animate-in fade-in duration-200">
      <div className={cn("flex-1 flex flex-col transition-all duration-300", selectedContent ? 'pr-[420px]' : '')}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Content Library</h1>
          <p className="text-muted-foreground">Browse and manage content across all connected CMS</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="pl-10"
            />
          </div>
          <select
            value={cmsFilter}
            onChange={e => setCmsFilter(e.target.value)}
            className="h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
          >
            <option value="all">All CMS</option>
            {connections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="wordCount">Sort by Word Count</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredContent.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Content Found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or load sample content from your CMS connections</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">CMS</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Author</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContent.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedContent(item);
                        setEditingTitle(item.title);
                        setSummary('');
                      }}
                      className={cn(
                        "cursor-pointer hover:bg-muted/30 transition-colors",
                        selectedContent?.id === item.id && "bg-primary/10"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground line-clamp-1">{item.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getCMSColor(getCMSType(item.cmsId))}`}>
                          {getCMSName(item.cmsId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.author || <span className="italic">No author</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {item.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{item.tags.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No tags</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedContent && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-card border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 z-30">
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
            <h2 className="font-semibold">Content Details</h2>
            <button onClick={() => setSelectedContent(null)} className="p-1 hover:bg-muted rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Title</label>
              <Input
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                onBlur={handleSaveTitle}
                className="font-medium"
              />
            </div>

            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getCMSColor(getCMSType(selectedContent.cmsId))}`}>
                {getCMSName(selectedContent.cmsId)}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(selectedContent.status)}`}>
                {selectedContent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Author</span>
                <p className="font-medium">{selectedContent.author || 'No author'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Word Count</span>
                <p className="font-medium font-mono">{selectedContent.wordCount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-medium font-mono">{format(new Date(selectedContent.date), 'MMM d, yyyy')}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Body Preview</label>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground max-h-[150px] overflow-y-auto">
                {selectedContent.body}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSummarize}
                disabled={!isGroqConfigured || isLoadingSummary}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isLoadingSummary ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Summarize with Groq
              </Button>

              {summary && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 text-accent text-xs mb-2">
                    <Zap className="w-3 h-3" />
                    Powered by Groq
                  </div>
                  <p className="text-sm text-foreground">{summary}</p>
                </div>
              )}

              <Button
                onClick={handleGenerateTags}
                disabled={!isGroqConfigured || isLoadingTags}
                variant="outline"
                className="w-full"
              >
                {isLoadingTags ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Tag className="w-4 h-4 mr-2" />
                )}
                Generate Tags with Groq
              </Button>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {selectedContent.tags.length > 0 ? (
                  selectedContent.tags.map(tag => (
                    <span key={tag} className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">No tags yet</span>
                )}
              </div>
            </div>

            <Button
              onClick={toggleStatus}
              variant="outline"
              className="w-full"
            >
              {selectedContent.status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
