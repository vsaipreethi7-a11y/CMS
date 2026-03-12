'use client';

import { useState } from 'react';
import { Bot, Check, X, Loader2, AlertTriangle, Clock, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentItem, Assignment } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AIAssignmentsProps {
  content: ContentItem[];
  assignments: Assignment[];
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateAssignment: (id: string, status: 'accepted' | 'dismissed') => void;
  onGenerateAssignments: () => Promise<void>;
  isGroqConfigured: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function AIAssignments({
  content,
  assignments,
  onUpdateAssignment,
  onGenerateAssignments,
  isGroqConfigured,
  showToast
}: AIAssignmentsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    accepted: assignments.filter(a => a.status === 'accepted').length,
    dismissed: assignments.filter(a => a.status === 'dismissed').length
  };

  const issues = {
    noTags: content.filter(c => c.tags.length === 0),
    drafts: content.filter(c => c.status === 'draft'),
    noAuthor: content.filter(c => !c.author),
    old: content.filter(c => {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      return new Date(c.date) < sixMonthsAgo;
    })
  };

  const totalIssues = issues.noTags.length + issues.drafts.length + issues.noAuthor.length + issues.old.length;

  const handleGenerate = async () => {
    if (!isGroqConfigured) {
      showToast('Please configure your Groq API key first', 'error');
      return;
    }
    setIsGenerating(true);
    setProgress({ current: 0, total: totalIssues });
    try {
      await onGenerateAssignments();
      showToast('Assignments generated successfully');
    } catch (error) {
      showToast('Failed to generate assignments', 'error');
    }
    setIsGenerating(false);
  };

  const getPriorityColor = (priority: Assignment['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const contentMap = new Map(content.map(c => [c.id, c]));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Assignments</h1>
        <p className="text-muted-foreground">AI-generated tasks based on content analysis</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              Content Analysis
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Found {totalIssues} potential issues across {content.length} content items
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!isGroqConfigured || isGenerating || totalIssues === 0}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Generate Assignments
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
              <span className="text-sm text-accent">
                Analyzing {progress.total} content items with Groq AI...
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              Missing Tags
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{issues.noTags.length}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              Draft Content
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{issues.drafts.length}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              No Author
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{issues.noAuthor.length}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              Old Content
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{issues.old.length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Assignments</h2>
        <div className="flex gap-2 text-sm">
          <span className="px-2 py-1 bg-muted rounded text-muted-foreground">
            Total: <span className="font-mono text-foreground">{stats.total}</span>
          </span>
          <span className="px-2 py-1 bg-amber-500/20 rounded text-amber-400">
            Pending: <span className="font-mono">{stats.pending}</span>
          </span>
          <span className="px-2 py-1 bg-emerald-500/20 rounded text-emerald-400">
            Accepted: <span className="font-mono">{stats.accepted}</span>
          </span>
          <span className="px-2 py-1 bg-muted rounded text-muted-foreground">
            Dismissed: <span className="font-mono">{stats.dismissed}</span>
          </span>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Assignments Yet</h3>
          <p className="text-muted-foreground">Click "Generate Assignments" to analyze your content and create AI-powered tasks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments
            .sort((a, b) => {
              if (a.status !== b.status) {
                if (a.status === 'pending') return -1;
                if (b.status === 'pending') return 1;
              }
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .map(assignment => {
              const relatedContent = contentMap.get(assignment.contentId);
              const isDone = assignment.status !== 'pending';
              
              return (
                <div
                  key={assignment.id}
                  className={cn(
                    "bg-card border border-border rounded-xl p-5 transition-all duration-300",
                    isDone && "opacity-50",
                    assignment.status === 'accepted' && "border-emerald-500/30 bg-emerald-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(assignment.priority)}`}>
                          {assignment.priority}
                        </span>
                        {assignment.status === 'accepted' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Accepted
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-foreground mb-1">{assignment.title}</h3>
                      
                      <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-xs text-accent mb-1">
                          <Zap className="w-3 h-3" />
                          AI-Generated
                        </div>
                        <p className="text-sm text-muted-foreground italic">{assignment.description}</p>
                      </div>

                      {relatedContent && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{relatedContent.title}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Suggested: {assignment.suggestedAction}</span>
                        <span>{formatDistanceToNow(new Date(assignment.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {!isDone && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            onUpdateAssignment(assignment.id, 'accepted');
                            showToast('Assignment accepted');
                          }}
                          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onUpdateAssignment(assignment.id, 'dismissed');
                            showToast('Assignment dismissed');
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
