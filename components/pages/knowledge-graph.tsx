'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn, ZoomOut, RotateCcw, Network, Filter, X,
  FileText, User, Database, Tag, Globe, Hash,
  TrendingUp, Calendar, BookOpen, Maximize2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CMSConnection, ContentItem } from '@/lib/types';
import { format } from 'date-fns';

interface KnowledgeGraphProps {
  connections: CMSConnection[];
  content: ContentItem[];
}

type NodeType = 'content' | 'author' | 'cms' | 'tag';

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  data?: ContentItem | CMSConnection | string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: 'cms' | 'author' | 'tag';
}

const CMS_COLORS: Record<string, string> = {
  wordpress: '#21759B',
  drupal: '#0077C0',
  joomla: '#F4460F',
};

const NODE_COLORS: Record<NodeType, string> = {
  cms: '#8B5CF6',
  content: '#06B6D4',
  author: '#F59E0B',
  tag: '#10B981',
};

const QUERY_FILTERS = [
  { id: 'all', label: 'All Nodes', filter: (_c: ContentItem, _conn: CMSConnection[]) => true },
  { id: 'drafts', label: 'Drafts', filter: (c: ContentItem) => c.status === 'draft' },
  { id: 'published', label: 'Published', filter: (c: ContentItem) => c.status === 'published' },
  { id: 'no-tags', label: 'No Tags', filter: (c: ContentItem) => c.tags.length === 0 },
  { id: 'tagged', label: 'Has Tags', filter: (c: ContentItem) => c.tags.length > 0 },
  { id: 'recent', label: 'This Week', filter: (c: ContentItem) => new Date(c.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  { id: 'long', label: 'Long-form (>800w)', filter: (c: ContentItem) => c.wordCount > 800 },
];

const LEGEND = [
  { type: 'cms', label: 'CMS', color: NODE_COLORS.cms, shape: 'rect' },
  { type: 'content', label: 'Content', color: NODE_COLORS.content, shape: 'circle' },
  { type: 'author', label: 'Author', color: NODE_COLORS.author, shape: 'diamond' },
  { type: 'tag', label: 'Tag', color: NODE_COLORS.tag, shape: 'hex' },
];

export function KnowledgeGraph({ connections, content }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [showTags, setShowTags] = useState(true);
  const [showAuthors, setShowAuthors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const W = 900, H = 650;

  const { nodes, edges } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];
    const seenAuthors = new Set<string>();
    const seenTags = new Set<string>();

    // CMS nodes — arranged in a large circle
    connections.forEach((conn, i) => {
      const angle = (i / Math.max(connections.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = nodePositions[conn.id]?.x ?? W / 2 + Math.cos(angle) * 280;
      const y = nodePositions[conn.id]?.y ?? H / 2 + Math.sin(angle) * 220;
      graphNodes.push({
        id: conn.id, type: 'cms', label: conn.name,
        x, y, size: 30,
        color: CMS_COLORS[conn.type] || NODE_COLORS.cms,
        data: conn,
      });
    });

    // Content nodes — orbit around their CMS
    content.forEach((item, i) => {
      const cmsIdx = connections.findIndex(c => c.id === item.cmsId);
      const cmsNode = graphNodes.find(n => n.id === item.cmsId);
      const baseAngle = cmsIdx >= 0 ? (cmsIdx / Math.max(connections.length, 1)) * Math.PI * 2 - Math.PI / 2 : 0;
      const orbit = 80 + (i % 4) * 35;
      const spread = (i % 12) * ((Math.PI * 2) / 12);
      const cx = cmsNode ? cmsNode.x : W / 2;
      const cy = cmsNode ? cmsNode.y : H / 2;
      const x = nodePositions[item.id]?.x ?? cx + Math.cos(baseAngle + spread) * orbit;
      const y = nodePositions[item.id]?.y ?? cy + Math.sin(baseAngle + spread) * orbit;
      const size = Math.min(Math.max(item.wordCount / 150, 8), 22);

      graphNodes.push({
        id: item.id, type: 'content', label: item.title,
        x, y, size,
        color: item.status === 'draft' ? '#F59E0B' : NODE_COLORS.content,
        data: item,
      });

      if (item.cmsId) graphEdges.push({ from: item.id, to: item.cmsId, type: 'cms' });

      // Author nodes
      if (item.author && showAuthors) {
        const authorId = `author_${item.author}`;
        if (!seenAuthors.has(authorId)) {
          seenAuthors.add(authorId);
          const aAngle = seenAuthors.size * 1.2;
          const ax = nodePositions[authorId]?.x ?? W / 2 + Math.cos(aAngle) * 160;
          const ay = nodePositions[authorId]?.y ?? H / 2 + Math.sin(aAngle) * 160;
          graphNodes.push({
            id: authorId, type: 'author', label: item.author,
            x: ax, y: ay, size: 18, color: NODE_COLORS.author,
          });
        }
        graphEdges.push({ from: item.id, to: authorId, type: 'author' });
      }

      // Tag nodes
      if (showTags) {
        item.tags.slice(0, 2).forEach(tag => {
          const tagId = `tag_${tag}`;
          if (!seenTags.has(tagId)) {
            seenTags.add(tagId);
            const tAngle = seenTags.size * 0.7;
            const dist = 120 + (seenTags.size % 3) * 40;
            const tx = nodePositions[tagId]?.x ?? W / 2 + Math.cos(tAngle) * dist;
            const ty = nodePositions[tagId]?.y ?? H / 2 + Math.sin(tAngle) * dist;
            graphNodes.push({
              id: tagId, type: 'tag', label: tag,
              x: tx, y: ty, size: 14, color: NODE_COLORS.tag,
            });
          }
          graphEdges.push({ from: item.id, to: tagId, type: 'tag' });
        });
      }
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [connections, content, nodePositions, showTags, showAuthors]);

  // Filter logic
  const highlightFromFilter = useCallback((filterId: string) => {
    setActiveFilter(filterId);
    if (filterId === 'all') { setHighlightedNodes(new Set()); return; }
    const filter = QUERY_FILTERS.find(f => f.id === filterId);
    if (!filter) return;
    const matched = content.filter(c => filter.filter(c, connections));
    const ids = new Set<string>();
    matched.forEach(c => {
      ids.add(c.id);
      if (c.author) ids.add(`author_${c.author}`);
      if (c.cmsId) ids.add(c.cmsId);
      c.tags.forEach(t => ids.add(`tag_${t}`));
    });
    setHighlightedNodes(ids);
  }, [content, connections]);

  // Drag nodes
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setDragOffset({ x: e.clientX - node.x * zoom, y: e.clientY - node.y * zoom });
    setSelectedNode(nodeId);
  };

  const handleSVGMouseDown = (e: React.MouseEvent) => {
    if (!draggingNode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingNode) {
        setNodePositions(prev => ({
          ...prev,
          [draggingNode]: { x: (e.clientX - dragOffset.x) / zoom, y: (e.clientY - dragOffset.y) / zoom },
        }));
      } else if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    };
    const onUp = () => { setDraggingNode(null); setIsPanning(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draggingNode, dragOffset, zoom, isPanning, panStart]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.3), 3));
  };

  // Selected node info
  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const connectedEdges = edges.filter(e => e.from === selectedNode || e.to === selectedNode);
  const connectedIds = new Set(connectedEdges.flatMap(e => [e.from, e.to]));

  const stats = {
    nodes: nodes.length,
    edges: edges.length,
    content: nodes.filter(n => n.type === 'content').length,
    authors: nodes.filter(n => n.type === 'author').length,
    tags: nodes.filter(n => n.type === 'tag').length,
    cms: nodes.filter(n => n.type === 'cms').length,
  };

  const filterCount = useMemo(() => {
    if (activeFilter === 'all') return content.length;
    const f = QUERY_FILTERS.find(f => f.id === activeFilter);
    return f ? content.filter(c => f.filter(c, connections)).length : 0;
  }, [activeFilter, content, connections]);

  const renderNodeShape = (node: GraphNode, isSelected: boolean) => {
    const s = node.size;
    const props = {
      fill: node.color,
      fillOpacity: isSelected ? 0.5 : 0.25,
      stroke: node.color,
      strokeWidth: isSelected ? 3 : 1.5,
    };
    switch (node.type) {
      case 'content': return <circle r={s} {...props} />;
      case 'cms': return <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={8} {...props} />;
      case 'author': return <polygon points={`0,${-s} ${s},${s / 2} ${-s},${s / 2}`} {...props} />;
      case 'tag': return (
        <polygon points={[0, 1, 2, 3, 4, 5].map(i => {
          const a = (i * 60 - 90) * Math.PI / 180;
          return `${Math.cos(a) * s},${Math.sin(a) * s}`;
        }).join(' ')} {...props} />
      );
    }
  };

  return (
    <div className="flex h-full gap-5 animate-in fade-in duration-200">
      {/* Graph canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Network className="w-6 h-6 text-primary" />
              </div>
              Knowledge Graph
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Visual map of content, authors, tags and CMS relationships
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle controls */}
            {[
              { label: 'Tags', active: showTags, toggle: () => setShowTags(p => !p), color: NODE_COLORS.tag },
              { label: 'Authors', active: showAuthors, toggle: () => setShowAuthors(p => !p), color: NODE_COLORS.author },
              { label: 'Labels', active: showLabels, toggle: () => setShowLabels(p => !p), color: '#6B7280' },
            ].map(t => (
              <button
                key={t.label}
                onClick={t.toggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${t.active ? 'text-foreground border-primary/30' : 'text-muted-foreground border-border opacity-50'}`}
                style={t.active ? { background: t.color + '15', borderColor: t.color + '40' } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </button>
            ))}

            <div className="h-6 w-px bg-border mx-1" />

            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(z * 1.25, 3))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(z / 1.25, 0.3))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setNodePositions({}); setSelectedNode(null); setActiveFilter('all'); setHighlightedNodes(new Set()); }}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          {[
            { label: 'Nodes', value: stats.nodes, color: 'text-foreground' },
            { label: 'Edges', value: stats.edges, color: 'text-foreground' },
            { label: 'Content', value: stats.content, color: 'text-cyan-400' },
            { label: 'Authors', value: stats.authors, color: 'text-amber-400' },
            { label: 'Tags', value: stats.tags, color: 'text-emerald-400' },
            { label: 'CMS', value: stats.cms, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="px-3 py-1.5 bg-card border border-border rounded-xl text-xs">
              <span className="text-muted-foreground">{s.label}: </span>
              <span className={`font-mono font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 flex-shrink-0">
          {LEGEND.map(l => (
            <div key={l.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg width="14" height="14" viewBox="-7 -7 14 14">
                {l.shape === 'circle' && <circle r="5" fill={l.color} fillOpacity="0.4" stroke={l.color} strokeWidth="1.5" />}
                {l.shape === 'rect' && <rect x="-5" y="-5" width="10" height="10" rx="2" fill={l.color} fillOpacity="0.4" stroke={l.color} strokeWidth="1.5" />}
                {l.shape === 'diamond' && <polygon points="0,-6 6,0 0,6 -6,0" fill={l.color} fillOpacity="0.4" stroke={l.color} strokeWidth="1.5" />}
                {l.shape === 'hex' && (
                  <polygon points={[0,1,2,3,4,5].map(i => {
                    const a = (i * 60 - 30) * Math.PI / 180;
                    return `${Math.cos(a)*5.5},${Math.sin(a)*5.5}`;
                  }).join(' ')} fill={l.color} fillOpacity="0.4" stroke={l.color} strokeWidth="1.5" />
                )}
              </svg>
              {l.label}
            </div>
          ))}
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden relative">
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div>
                <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Data</h3>
                <p className="text-muted-foreground text-sm">Connect a CMS and sync content to visualize the graph</p>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full"
              viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${W / zoom} ${H / zoom}`}
              onMouseDown={handleSVGMouseDown}
              onWheel={handleWheel}
              style={{ cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'grab' }}
            >
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {edges.map((edge, i) => {
                const from = nodes.find(n => n.id === edge.from);
                const to = nodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                const isActive = highlightedNodes.size > 0
                  ? highlightedNodes.has(edge.from) && highlightedNodes.has(edge.to)
                  : selectedNode
                    ? (connectedIds.has(edge.from) && connectedIds.has(edge.to))
                    : true;
                const edgeColor = edge.type === 'cms' ? '#8B5CF6' : edge.type === 'author' ? '#F59E0B' : '#10B981';
                return (
                  <line
                    key={i}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isActive ? edgeColor : '#1F2937'}
                    strokeWidth={isActive ? 1.5 : 0.8}
                    opacity={isActive ? 0.7 : 0.15}
                    strokeDasharray={edge.type === 'tag' ? '3,3' : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const isSelected = selectedNode === node.id;
                const isConnected = connectedIds.has(node.id);
                const isFiltered = highlightedNodes.size > 0 ? highlightedNodes.has(node.id) : true;
                const dimmed = (!isFiltered) || (selectedNode && !isSelected && !isConnected);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={e => handleNodeMouseDown(node.id, e)}
                    className="cursor-pointer"
                    opacity={dimmed ? 0.15 : 1}
                    filter={isSelected ? 'url(#glow)' : undefined}
                  >
                    {renderNodeShape(node, isSelected)}
                    {showLabels && (
                      <text
                        y={node.size + 13}
                        textAnchor="middle"
                        fill={isSelected ? '#F9FAFB' : '#9CA3AF'}
                        fontSize={isSelected ? 11 : 9}
                        fontWeight={isSelected ? 600 : 400}
                      >
                        {node.label.slice(0, 18)}{node.label.length > 18 ? '…' : ''}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Zoom badge */}
          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-muted-foreground bg-background/80 px-2 py-1 rounded-lg border border-border">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-[280px] shrink-0 flex flex-col gap-4">
        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Filters
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {QUERY_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => highlightFromFilter(f.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  activeFilter === f.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {activeFilter !== 'all' && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{filterCount}</span> matching
              </p>
              <button onClick={() => highlightFromFilter('all')} className="text-[10px] text-primary hover:underline">Clear</button>
            </div>
          )}
        </div>

        {/* Selected node inspector */}
        {selectedNodeData ? (
          <div className="bg-card border border-border rounded-2xl p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Node Details
              </h3>
              <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-muted">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: selectedNodeData.color + '20', border: `1.5px solid ${selectedNodeData.color}40` }}>
                {selectedNodeData.type === 'content' && <FileText className="w-4 h-4" style={{ color: selectedNodeData.color }} />}
                {selectedNodeData.type === 'cms' && <Globe className="w-4 h-4" style={{ color: selectedNodeData.color }} />}
                {selectedNodeData.type === 'author' && <User className="w-4 h-4" style={{ color: selectedNodeData.color }} />}
                {selectedNodeData.type === 'tag' && <Tag className="w-4 h-4" style={{ color: selectedNodeData.color }} />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">{selectedNodeData.label}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: selectedNodeData.color }}>
                  {selectedNodeData.type}
                </p>
              </div>
            </div>

            {/* Content details */}
            {selectedNodeData.type === 'content' && selectedNodeData.data && (() => {
              const item = selectedNodeData.data as ContentItem;
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Status', value: item.status, icon: Database },
                      { label: 'Words', value: item.wordCount.toLocaleString(), icon: Hash },
                      { label: 'Author', value: item.author || '—', icon: User },
                      { label: 'Date', value: format(new Date(item.date), 'MMM d, yy'), icon: Calendar },
                    ].map(m => (
                      <div key={m.label} className="p-2 bg-muted/40 rounded-xl">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1 mb-0.5">
                          <m.icon className="w-2.5 h-2.5" /> {m.label}
                        </p>
                        <p className="text-xs font-semibold text-foreground truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {item.tags.length > 0 && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Preview</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{item.body}</p>
                  </div>
                </div>
              );
            })()}

            {/* CMS details */}
            {selectedNodeData.type === 'cms' && selectedNodeData.data && (() => {
              const conn = selectedNodeData.data as CMSConnection;
              const itemCount = content.filter(c => c.cmsId === conn.id).length;
              return (
                <div className="space-y-2">
                  {[
                    { label: 'Type', value: conn.type },
                    { label: 'URL', value: conn.url },
                    { label: 'Status', value: conn.status },
                    { label: 'Items', value: `${itemCount} content items` },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-medium text-foreground truncate max-w-[130px]">{m.value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Author details */}
            {selectedNodeData.type === 'author' && (
              <div className="space-y-2">
                {(() => {
                  const authorName = selectedNodeData.label;
                  const authorContent = content.filter(c => c.author === authorName);
                  return (
                    <>
                      <p className="text-xs text-muted-foreground">{authorContent.length} articles</p>
                      {authorContent.slice(0, 4).map(c => (
                        <div key={c.id} className="text-xs p-2 bg-muted/40 rounded-xl">
                          <p className="font-medium text-foreground truncate">{c.title}</p>
                          <p className="text-muted-foreground mt-0.5">{c.status}</p>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Connections summary */}
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1.5">
                Connections ({connectedEdges.length})
              </p>
              <div className="space-y-1">
                {[...connectedIds].filter(id => id !== selectedNode).slice(0, 5).map(id => {
                  const n = nodes.find(x => x.id === id);
                  if (!n) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedNode(id)}
                      className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground text-left py-0.5 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                      <span className="truncate">{n.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center">
            <Network className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Click any node to inspect details</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Drag to move · Scroll to zoom</p>
          </div>
        )}
      </div>
    </div>
  );
}
