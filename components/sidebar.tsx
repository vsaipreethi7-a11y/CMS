'use client';

import { Home, Plug, FileText, Network, Bot, Search, Settings, Hexagon, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Page = 'dashboard' | 'connections' | 'content' | 'graph' | 'assignments' | 'search' | 'llm' | 'settings' | 'agents';

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  isGroqConfigured: boolean;
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'connections', label: 'CMS Connections', icon: Plug },
  { id: 'content', label: 'Content Library', icon: FileText },
  { id: 'graph', label: 'Knowledge Graph', icon: Network },
  { id: 'assignments', label: 'AI Assignments', icon: Bot },
  { id: 'agents', label: 'AI Agents', icon: BrainCircuit },
  { id: 'search', label: 'NLQ Search', icon: Search },
  { id: 'llm', label: 'LLM Studio', icon: BrainCircuit },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activePage, onPageChange, isGroqConfigured }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-card border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Hexagon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-primary">CMS Nexus</h1>
            <p className="text-xs text-muted-foreground">AI-Powered</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  activePage === item.id
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isGroqConfigured ? 'bg-emerald-500' : 'bg-amber-500'
          )} />
          <span className="text-xs text-muted-foreground">
            {isGroqConfigured ? 'Groq Connected' : 'Groq Not Configured'}
          </span>
        </div>
      </div>
    </aside>
  );
}
