'use client';

import { useState } from 'react';
import { Plus, Trash2, Download, Eye, EyeOff, ExternalLink, Plug, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CMSConnection, CMSType } from '@/lib/types';

interface ConnectionsProps {
  connections: CMSConnection[];
  onAddConnection: (connection: Omit<CMSConnection, 'id' | 'createdAt' | 'status'>) => void;
  onRemoveConnection: (id: string) => void;
  onLoadSampleContent: (cmsId: string) => void;
  onSyncContent: (cmsId: string) => Promise<{ added: number; updated: number }>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function Connections({
  connections,
  onAddConnection,
  onRemoveConnection,
  onLoadSampleContent,
  onSyncContent,
  showToast
}: ConnectionsProps) {
  const [formData, setFormData] = useState({
    type: 'wordpress' as CMSType,
    name: '',
    url: '',
    apiKey: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url || !formData.apiKey) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    onAddConnection(formData);
    setFormData({ type: 'wordpress', name: '', url: '', apiKey: '' });
    showToast('Connection added successfully');
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSync = async (connId: string, connName: string) => {
    setSyncingId(connId);
    try {
      const { added, updated } = await onSyncContent(connId);
      showToast(`Synced ${added + updated} items from ${connName}`, 'success');
    } catch (err) {
      showToast(`Sync failed: ${String(err)}`, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const getCMSBadgeColor = (type: CMSType) => {
    switch (type) {
      case 'wordpress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'drupal': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'joomla': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CMS Connections</h1>
        <p className="text-muted-foreground">Manage your content management system integrations</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Add New Connection
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">CMS Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as CMSType }))}
              className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="wordpress">WordPress</option>
              <option value="drupal">Drupal</option>
              <option value="joomla">Joomla</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Site Name</label>
            <Input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Blog"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">API URL</label>
            <Input
              value={formData.url}
              onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://mysite.com"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              {formData.type === 'joomla' ? 'API Token' : 'Username:App Password'}
            </label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={formData.type === 'joomla' ? 'Paste API token' : 'admin:xxxx xxxx xxxx xxxx'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formData.type === 'wordpress' && 'Format: username:app_password — generate in WP Admin → Users → Profile'}
              {formData.type === 'drupal' && 'Format: username:password — REST API must be enabled'}
              {formData.type === 'joomla' && 'Generate in Joomla Admin → System → API Tokens (v4+)'}
            </p>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Connected CMS ({connections.length})</h2>
        {connections.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Plug className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Connections Yet</h3>
            <p className="text-muted-foreground">Add your first CMS connection above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map(conn => (
              <div key={conn.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{conn.name}</h3>
                    <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full border ${getCMSBadgeColor(conn.type)}`}>
                      {conn.type}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    conn.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ExternalLink className="w-4 h-4" />
                    <span className="truncate">{conn.url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono text-xs">
                      {visibleKeys.has(conn.id) ? conn.apiKey : '••••••••••••'}
                    </span>
                    <button
                      onClick={() => toggleKeyVisibility(conn.id)}
                      className="hover:text-foreground"
                    >
                      {visibleKeys.has(conn.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(conn.id, conn.name)}
                    disabled={syncingId === conn.id}
                    className="flex-1 bg-primary/5 border-primary/30 hover:bg-primary/15 text-primary"
                  >
                    {syncingId === conn.id
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <RefreshCw className="w-4 h-4 mr-1" />
                    }
                    {syncingId === conn.id ? 'Syncing...' : 'Sync Live Content'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onLoadSampleContent(conn.id);
                      showToast('Sample content loaded');
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onRemoveConnection(conn.id);
                      showToast('Connection removed');
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
