'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Dashboard } from '@/components/pages/dashboard';
import { Connections } from '@/components/pages/connections';
import { ContentLibrary } from '@/components/pages/content-library';
import { KnowledgeGraph } from '@/components/pages/knowledge-graph';
import { AIAssignments } from '@/components/pages/ai-assignments';
import { NLQSearch } from '@/components/pages/nlq-search';
import { LLMStudio } from '@/components/pages/llm-studio';
import { Settings } from '@/components/pages/settings';
import { ToastProvider, useToastContext } from '@/components/toast-provider';
import { useCMS } from '@/hooks/use-cms';
import { useGroq } from '@/hooks/use-groq';
import type { ContentItem, Assignment } from '@/lib/types';
import { Bell } from 'lucide-react';
import { Agents } from '@/components/pages/agents';
import type { Page } from '@/components/sidebar';

function CMSNexusApp() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const { showToast } = useToastContext();
  const { complete, completeJSON, isConfigured } = useGroq();
  const cms = useCMS();

  const getPageTitle = (page: Page) => {
    switch (page) {
      case 'dashboard': return 'Dashboard';
      case 'connections': return 'CMS Connections';
      case 'content': return 'Content Library';
      case 'graph': return 'Knowledge Graph';
      case 'assignments': return 'AI Assignments';
      case 'search': return 'NLQ Search';
      case 'llm': return 'LLM Studio';
      case 'agents': return 'AI Agents';
      case 'settings': return 'Settings';
    }
  };

  const handleSummarize = useCallback(async (content: ContentItem) => {
    const prompt = `Summarize this content in 2-3 sentences:
Title: ${content.title}
Content: ${content.body}`;
    return complete(prompt, 'You are a content summarization expert. Provide concise, informative summaries.');
  }, [complete]);

  const handleGenerateTags = useCallback(async (content: ContentItem) => {
    const prompt = `Generate 5 relevant tags for this content. Return only a JSON array of strings.
Title: ${content.title}
Content: ${content.body}`;
    const result = await completeJSON<string[]>(prompt, 'You are a content tagging expert.');
    return result || [];
  }, [completeJSON]);

  const handleGenerateAssignments = useCallback(async () => {
    const issues: { type: string; content: ContentItem }[] = [];
    
    cms.content.forEach(c => {
      if (c.tags.length === 0) issues.push({ type: 'missing_tags', content: c });
      if (c.status === 'draft') issues.push({ type: 'draft_status', content: c });
      if (!c.author) issues.push({ type: 'no_author', content: c });
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      if (new Date(c.date) < sixMonthsAgo) issues.push({ type: 'old_content', content: c });
    });

    for (const issue of issues.slice(0, 10)) {
      const issueDescription = {
        missing_tags: 'Content has no tags',
        draft_status: 'Content is still in draft status',
        no_author: 'Content has no assigned author',
        old_content: 'Content is more than 6 months old'
      }[issue.type];

      const prompt = `You are a content operations AI. Generate a short actionable assignment for a content editor.
Issue: ${issueDescription}
Content Title: ${issue.content.title}
Return JSON: {"title": "short task title", "description": "2-3 sentence description", "priority": "high|medium|low", "suggestedAction": "specific action to take"}`;

      const result = await completeJSON<{
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        suggestedAction: string;
      }>(prompt, 'You are a content operations AI assistant.');

      if (result) {
        cms.addAssignment({
          contentId: issue.content.id,
          title: result.title,
          description: result.description,
          priority: result.priority,
          suggestedAction: result.suggestedAction
        });
      }
    }
    
    cms.logActivity('Assignments Generated', `Generated assignments for ${Math.min(issues.length, 10)} content issues`);
  }, [cms, completeJSON]);

  const handleLLMRequest = useCallback(async (prompt: string, systemPrompt: string, _mode: string) => {
    console.log('[v0] handleLLMRequest called with mode:', _mode);
    return complete(prompt, systemPrompt);
  }, [complete]);

  const handleNLQSearch = useCallback(async (query: string) => {
    const contentSummary = cms.content.map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      author: c.author,
      tags: c.tags,
      cmsId: c.cmsId,
      date: c.date
    }));

    const cmsInfo = cms.connections.map(c => ({ id: c.id, name: c.name, type: c.type }));

    const prompt = `You are a CMS search assistant. 
Available CMS connections: ${JSON.stringify(cmsInfo)}
Content items: ${JSON.stringify(contentSummary)}
User query: "${query}"

Find matching content items based on the user's natural language query.
Return JSON: {"matches": [{"id": "content_id", "reason": "why this matches"}], "summary": "brief explanation of what you found"}`;

    const result = await completeJSON<{
      matches: { id: string; reason: string }[];
      summary: string;
    }>(prompt, 'You are an intelligent CMS search assistant. Understand natural language queries and find relevant content.');

    return result || { matches: [], summary: 'No results found' };
  }, [cms.content, cms.connections, completeJSON]);

  if (!cms.isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading CMS Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        isGroqConfigured={isConfigured}
      />

      <div className="ml-[260px] min-h-screen">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">CMS Nexus</span>
              <span>/</span>
              <span>{getPageTitle(activePage)}</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {cms.activityLog.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </header>

        <main className="p-6 min-h-[calc(100vh-73px)]">
          {activePage === 'dashboard' && (
            <Dashboard
              connections={cms.connections}
              content={cms.content}
              assignments={cms.assignments}
              activityLog={cms.activityLog}
            />
          )}

          {activePage === 'connections' && (
            <Connections
              connections={cms.connections}
              onAddConnection={cms.addConnection}
              onRemoveConnection={cms.removeConnection}
              onLoadSampleContent={cms.loadSampleContent}
              onSyncContent={cms.syncLiveContent}
              showToast={showToast}
            />
          )}

          {activePage === 'content' && (
            <ContentLibrary
              connections={cms.connections}
              content={cms.content}
              onUpdateContent={cms.updateContent}
              onSummarize={handleSummarize}
              onGenerateTags={handleGenerateTags}
              isGroqConfigured={isConfigured}
              showToast={showToast}
            />
          )}

          {activePage === 'graph' && (
            <KnowledgeGraph
              connections={cms.connections}
              content={cms.content}
            />
          )}

          {activePage === 'assignments' && (
            <AIAssignments
              content={cms.content}
              assignments={cms.assignments}
              onAddAssignment={cms.addAssignment}
              onUpdateAssignment={cms.updateAssignment}
              onGenerateAssignments={handleGenerateAssignments}
              isGroqConfigured={isConfigured}
              showToast={showToast}
            />
          )}

          {activePage === 'search' && (
            <NLQSearch
              connections={cms.connections}
              content={cms.content}
              queryHistory={cms.queryHistory}
              onSearch={handleNLQSearch}
              onAddQueryToHistory={cms.addQueryToHistory}
              isGroqConfigured={isConfigured}
              showToast={showToast}
            />
          )}

          {activePage === 'llm' && (
            <LLMStudio
              connections={cms.connections}
              content={cms.content}
              isGroqConfigured={isConfigured}
              onLLMRequest={handleLLMRequest}
              showToast={showToast}
            />
          )}

          {activePage === 'agents' && (
            <Agents 
              showToast={showToast} 
              connections={cms.connections}
            />
          )}

          {activePage === 'settings' && (
            <Settings
              onClearData={cms.clearAllData}
              onLoadDemoData={cms.loadDemoData}
              onExportData={cms.exportData}
              onImportData={cms.importData}
              showToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <CMSNexusApp />
    </ToastProvider>
  );
}
