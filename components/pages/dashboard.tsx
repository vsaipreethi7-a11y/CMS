'use client';

import { Plug, FileText, Bot, Network, Clock, Activity } from 'lucide-react';
import type { CMSConnection, ContentItem, Assignment, ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface DashboardProps {
  connections: CMSConnection[];
  content: ContentItem[];
  assignments: Assignment[];
  activityLog: ActivityLog[];
}

export function Dashboard({ connections, content, assignments, activityLog }: DashboardProps) {
  const pendingAssignments = assignments.filter(a => a.status === 'pending').length;
  const graphNodes = content.length * 3;

  const stats = [
    { label: 'Connected CMS', value: connections.length, icon: Plug, color: 'text-primary' },
    { label: 'Total Content Items', value: content.length, icon: FileText, color: 'text-secondary' },
    { label: 'AI Assignments Pending', value: pendingAssignments, icon: Bot, color: 'text-accent' },
    { label: 'Knowledge Graph Nodes', value: graphNodes, icon: Network, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your CMS integration platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color} opacity-30`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          {activityLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No recent activity</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-[400px] overflow-y-auto">
              {activityLog.slice(0, 10).map(log => (
                <li key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plug className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-semibold">System Status</h2>
          </div>
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No CMS connections</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {connections.map(conn => (
                <li key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      conn.status === 'connected' ? 'bg-emerald-500' :
                      conn.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{conn.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{conn.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    conn.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                    conn.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {conn.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
