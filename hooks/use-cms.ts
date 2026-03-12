'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CMSConnection, ContentItem, Assignment, ActivityLog, QueryHistory } from '@/lib/types';

const DEMO_CONNECTIONS: CMSConnection[] = [
  { id: 'wp1', name: 'Tech Blog', type: 'wordpress', url: 'https://techblog.example.com', apiKey: 'wp_key_xxx', status: 'connected', createdAt: new Date().toISOString() },
  { id: 'd1', name: 'News Site', type: 'drupal', url: 'https://news.example.com', apiKey: 'drupal_key_xxx', status: 'connected', createdAt: new Date().toISOString() },
];

const DEMO_CONTENT: ContentItem[] = [
  { id: 'c1', cmsId: 'wp1', title: 'Introduction to Machine Learning', body: 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. This comprehensive guide covers the fundamentals of ML algorithms, including supervised learning, unsupervised learning, and reinforcement learning.', author: 'John Smith', status: 'published', date: new Date().toISOString(), tags: ['AI', 'Machine Learning'], wordCount: 1200 },
  { id: 'c2', cmsId: 'wp1', title: 'Top 10 Web Frameworks 2024', body: 'Explore the most popular web frameworks of 2024. From React to Next.js, Vue to Svelte, this article covers the best tools for modern web development with practical examples and use cases.', author: 'Sarah Johnson', status: 'published', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Web Development', 'JavaScript'], wordCount: 2500 },
  { id: 'c3', cmsId: 'wp1', title: 'Understanding REST APIs', body: 'REST APIs are the backbone of modern web applications. Learn about HTTP methods, status codes, authentication, and best practices for designing scalable APIs.', author: 'Mike Chen', status: 'draft', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 1800 },
  { id: 'c4', cmsId: 'wp1', title: 'Docker for Beginners', body: 'Containerization has revolutionized software deployment. This guide walks you through Docker basics, creating containers, and orchestrating with Docker Compose.', author: 'John Smith', status: 'published', date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), tags: ['DevOps', 'Docker'], wordCount: 3200 },
  { id: 'c5', cmsId: 'd1', title: 'Breaking: Tech Giants Announce AI Partnership', body: 'Major technology companies have announced a groundbreaking partnership to advance AI safety and development. The collaboration aims to establish industry standards for responsible AI deployment.', author: 'Emily Davis', status: 'published', date: new Date().toISOString(), tags: ['News', 'AI'], wordCount: 800 },
  { id: 'c6', cmsId: 'd1', title: 'Climate Summit 2024 Highlights', body: 'World leaders gathered for the annual climate summit to discuss emission targets and sustainable policies. Key agreements include commitments to renewable energy transition.', author: 'Robert Williams', status: 'pending', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 1500 },
  { id: 'c7', cmsId: 'd1', title: 'Economic Outlook for Q4', body: 'Analysts predict moderate growth in the fourth quarter despite global uncertainties. Key sectors to watch include technology, healthcare, and renewable energy.', author: '', status: 'draft', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Economy'], wordCount: 1100 },
  { id: 'c8', cmsId: 'wp1', title: 'Kubernetes Best Practices', body: 'Learn how to optimize your Kubernetes deployments with these proven best practices. Topics include resource management, security, and monitoring strategies.', author: 'Alex Turner', status: 'published', date: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 2800 },
  { id: 'c9', cmsId: 'd1', title: 'Space Exploration Updates', body: 'NASA and private space companies continue to push boundaries with new missions and discoveries. This article covers recent launches and upcoming expeditions.', author: 'Lisa Park', status: 'published', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Science', 'Space'], wordCount: 950 },
  { id: 'c10', cmsId: 'wp1', title: 'TypeScript Advanced Patterns', body: 'Take your TypeScript skills to the next level with advanced patterns including generics, conditional types, mapped types, and utility types. Includes practical examples.', author: 'Sarah Johnson', status: 'draft', date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), tags: ['TypeScript', 'JavaScript'], wordCount: 4000 },
];

const WORDPRESS_CONTENT: ContentItem[] = [
  { id: 'wp_s1', cmsId: '', title: 'Getting Started with WordPress Gutenberg', body: 'The Gutenberg editor has transformed content creation in WordPress. Learn how to use blocks, patterns, and full site editing to create stunning pages.', author: 'James Wilson', status: 'published', date: new Date().toISOString(), tags: ['WordPress', 'Tutorial'], wordCount: 1500 },
  { id: 'wp_s2', cmsId: '', title: 'WordPress Security Essentials', body: 'Protect your WordPress site with these essential security practices. From plugin choices to server configuration, keep your site safe from threats.', author: 'Amanda Lee', status: 'published', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Security'], wordCount: 2000 },
  { id: 'wp_s3', cmsId: '', title: 'WooCommerce Setup Guide', body: 'Turn your WordPress site into an online store with WooCommerce. This comprehensive guide covers installation, product setup, and payment configuration.', author: 'Chris Brown', status: 'draft', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 3500 },
  { id: 'wp_s4', cmsId: '', title: 'WordPress Theme Development', body: 'Build custom WordPress themes from scratch. Learn about template hierarchy, theme functions, and modern development workflows.', author: '', status: 'pending', date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Development'], wordCount: 4200 },
  { id: 'wp_s5', cmsId: '', title: 'Optimizing WordPress Performance', body: 'Speed up your WordPress site with caching, image optimization, and database tuning. Essential tips for better Core Web Vitals scores.', author: 'James Wilson', status: 'published', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Performance', 'SEO'], wordCount: 1800 },
  { id: 'wp_s6', cmsId: '', title: 'WordPress Multisite Configuration', body: 'Manage multiple WordPress sites from a single installation. Learn multisite setup, user management, and network administration.', author: 'Amanda Lee', status: 'draft', date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 2200 },
  { id: 'wp_s7', cmsId: '', title: 'REST API Integration in WordPress', body: 'Leverage the WordPress REST API to build headless applications. Examples include React frontends and mobile app backends.', author: 'Chris Brown', status: 'published', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), tags: ['API', 'JavaScript'], wordCount: 2800 },
  { id: 'wp_s8', cmsId: '', title: 'WordPress Plugin Development', body: 'Create your first WordPress plugin with this step-by-step tutorial. Covers hooks, filters, admin interfaces, and best practices.', author: 'James Wilson', status: 'published', date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Development', 'PHP'], wordCount: 3800 },
];

const DRUPAL_CONTENT: ContentItem[] = [
  { id: 'dr_s1', cmsId: '', title: 'Drupal 10 Migration Guide', body: 'Upgrade your Drupal 9 site to Drupal 10 with this comprehensive migration guide. Covers module compatibility, theme updates, and testing strategies.', author: 'Maria Garcia', status: 'published', date: new Date().toISOString(), tags: ['Drupal', 'Migration'], wordCount: 2500 },
  { id: 'dr_s2', cmsId: '', title: 'Building Custom Drupal Modules', body: 'Extend Drupal functionality with custom modules. Learn about the plugin system, services, and dependency injection.', author: 'David Kim', status: 'published', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Development'], wordCount: 3200 },
  { id: 'dr_s3', cmsId: '', title: 'Drupal Content Modeling', body: 'Design effective content architectures in Drupal. Covers content types, fields, taxonomies, and entity references.', author: 'Maria Garcia', status: 'draft', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 1800 },
  { id: 'dr_s4', cmsId: '', title: 'Drupal Paragraphs Deep Dive', body: 'Create flexible content layouts with the Paragraphs module. Build reusable components for content editors.', author: '', status: 'pending', date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Content'], wordCount: 2100 },
  { id: 'dr_s5', cmsId: '', title: 'Drupal Views Tutorial', body: 'Master Drupal Views to create dynamic listings, reports, and displays. Covers filters, relationships, and exposed forms.', author: 'David Kim', status: 'published', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Tutorial', 'Views'], wordCount: 2700 },
  { id: 'dr_s6', cmsId: '', title: 'Drupal API-First Development', body: 'Build decoupled Drupal applications with JSON:API and GraphQL. Integrate with modern JavaScript frameworks.', author: 'Maria Garcia', status: 'published', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), tags: ['API', 'Decoupled'], wordCount: 3000 },
  { id: 'dr_s7', cmsId: '', title: 'Drupal Security Best Practices', body: 'Secure your Drupal installation with these essential practices. Input validation, access control, and security updates.', author: 'David Kim', status: 'draft', date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 1600 },
  { id: 'dr_s8', cmsId: '', title: 'Drupal Performance Optimization', body: 'Optimize Drupal for speed with caching strategies, database tuning, and CDN integration. Achieve faster page loads.', author: 'Maria Garcia', status: 'published', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Performance'], wordCount: 2400 },
];

const JOOMLA_CONTENT: ContentItem[] = [
  { id: 'jm_s1', cmsId: '', title: 'Joomla 5 New Features', body: 'Explore the exciting new features in Joomla 5. From improved accessibility to enhanced media management, discover what\'s new.', author: 'Kevin Taylor', status: 'published', date: new Date().toISOString(), tags: ['Joomla', 'Updates'], wordCount: 1800 },
  { id: 'jm_s2', cmsId: '', title: 'Building Joomla Templates', body: 'Create custom Joomla templates with Bootstrap 5. Learn template positions, overrides, and child templates.', author: 'Nina Patel', status: 'published', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Templates'], wordCount: 2800 },
  { id: 'jm_s3', cmsId: '', title: 'Joomla E-commerce Solutions', body: 'Set up an online store with Joomla using VirtueMart or HikaShop. Compare features and choose the right solution.', author: 'Kevin Taylor', status: 'draft', date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 2200 },
  { id: 'jm_s4', cmsId: '', title: 'Joomla Multi-language Setup', body: 'Configure Joomla for multilingual content. Manage translations, language associations, and SEF URLs.', author: '', status: 'pending', date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Multilingual'], wordCount: 1900 },
  { id: 'jm_s5', cmsId: '', title: 'Joomla Component Development', body: 'Build custom Joomla components following MVC patterns. Covers admin and site components, ACL, and database access.', author: 'Nina Patel', status: 'published', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Development', 'PHP'], wordCount: 4000 },
  { id: 'jm_s6', cmsId: '', title: 'Joomla User Management', body: 'Manage users, groups, and access levels in Joomla. Implement custom registration and profile management.', author: 'Kevin Taylor', status: 'published', date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Users', 'ACL'], wordCount: 1700 },
  { id: 'jm_s7', cmsId: '', title: 'Joomla SEO Configuration', body: 'Optimize Joomla for search engines. Configure SEF URLs, metadata, structured data, and sitemap generation.', author: 'Nina Patel', status: 'draft', date: new Date(Date.now() - 220 * 24 * 60 * 60 * 1000).toISOString(), tags: [], wordCount: 2100 },
  { id: 'jm_s8', cmsId: '', title: 'Joomla Backup and Recovery', body: 'Protect your Joomla site with regular backups. Learn about backup extensions, restoration, and disaster recovery.', author: 'Kevin Taylor', status: 'published', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), tags: ['Security', 'Backup'], wordCount: 1500 },
];

const CMS_ENDPOINTS: Record<string, string> = {
  wordpress: '/api/agents/wordpress',
  drupal: '/api/agents/drupal',
  joomla: '/api/agents/joomla',
};

export function useCMS() {
  const [connections, setConnections] = useState<CMSConnection[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storedConnections = localStorage.getItem('cms_connections');
    const storedContent = localStorage.getItem('cms_content');
    const storedAssignments = localStorage.getItem('cms_assignments');
    const storedActivityLog = localStorage.getItem('cms_activity');
    const storedQueryHistory = localStorage.getItem('cms_query_history');
    
    if (storedConnections) {
      setConnections(JSON.parse(storedConnections));
    } else {
      setConnections(DEMO_CONNECTIONS);
      localStorage.setItem('cms_connections', JSON.stringify(DEMO_CONNECTIONS));
    }
    
    if (storedContent) {
      setContent(JSON.parse(storedContent));
    } else {
      setContent(DEMO_CONTENT);
      localStorage.setItem('cms_content', JSON.stringify(DEMO_CONTENT));
    }
    
    if (storedAssignments) {
      setAssignments(JSON.parse(storedAssignments));
    }
    
    if (storedActivityLog) {
      setActivityLog(JSON.parse(storedActivityLog));
    }
    
    if (storedQueryHistory) {
      setQueryHistory(JSON.parse(storedQueryHistory));
    }
    
    setIsLoaded(true);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('cms_connections', JSON.stringify(connections));
  }, [connections, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('cms_content', JSON.stringify(content));
  }, [content, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('cms_assignments', JSON.stringify(assignments));
  }, [assignments, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('cms_activity', JSON.stringify(activityLog));
  }, [activityLog, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('cms_query_history', JSON.stringify(queryHistory));
  }, [queryHistory, isLoaded]);

  const logActivity = useCallback((action: string, details: string) => {
    const newLog: ActivityLog = {
      id: `log_${Date.now()}`,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setActivityLog(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const addConnection = useCallback((connection: Omit<CMSConnection, 'id' | 'createdAt' | 'status'>) => {
    const newConnection: CMSConnection = {
      ...connection,
      id: `cms_${Date.now()}`,
      status: 'connected',
      createdAt: new Date().toISOString()
    };
    setConnections(prev => [...prev, newConnection]);
    logActivity('Connection Added', `Added ${connection.type} connection: ${connection.name}`);
    return newConnection;
  }, [logActivity]);

  const removeConnection = useCallback((id: string) => {
    const connection = connections.find(c => c.id === id);
    setConnections(prev => prev.filter(c => c.id !== id));
    setContent(prev => prev.filter(c => c.cmsId !== id));
    if (connection) {
      logActivity('Connection Removed', `Removed ${connection.type} connection: ${connection.name}`);
    }
  }, [connections, logActivity]);

  const loadSampleContent = useCallback((cmsId: string) => {
    const connection = connections.find(c => c.id === cmsId);
    if (!connection) return;

    let sampleContent: ContentItem[] = [];
    switch (connection.type) {
      case 'wordpress':
        sampleContent = WORDPRESS_CONTENT.map(c => ({ ...c, id: `${c.id}_${Date.now()}`, cmsId }));
        break;
      case 'drupal':
        sampleContent = DRUPAL_CONTENT.map(c => ({ ...c, id: `${c.id}_${Date.now()}`, cmsId }));
        break;
      case 'joomla':
        sampleContent = JOOMLA_CONTENT.map(c => ({ ...c, id: `${c.id}_${Date.now()}`, cmsId }));
        break;
    }

    setContent(prev => [...prev, ...sampleContent]);
    logActivity('Content Loaded', `Loaded ${sampleContent.length} sample items for ${connection.name}`);
  }, [connections, logActivity]);

  const updateContent = useCallback((id: string, updates: Partial<ContentItem>) => {
    setContent(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const item = content.find(c => c.id === id);
    if (item) {
      logActivity('Content Updated', `Updated "${item.title}"`);
    }
  }, [content, logActivity]);

  const addAssignment = useCallback((assignment: Omit<Assignment, 'id' | 'createdAt' | 'status'>) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, []);

  const updateAssignment = useCallback((id: string, status: 'accepted' | 'dismissed') => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      logActivity('Assignment Updated', `${status === 'accepted' ? 'Accepted' : 'Dismissed'} assignment: ${assignment.title}`);
    }
  }, [assignments, logActivity]);

  const addQueryToHistory = useCallback((query: string, resultCount: number) => {
    const newQuery: QueryHistory = {
      id: `query_${Date.now()}`,
      query,
      timestamp: new Date().toISOString(),
      resultCount
    };
    setQueryHistory(prev => [newQuery, ...prev].slice(0, 10));
  }, []);

  const clearAllData = useCallback(() => {
    setConnections([]);
    setContent([]);
    setAssignments([]);
    setActivityLog([]);
    setQueryHistory([]);
    localStorage.removeItem('cms_connections');
    localStorage.removeItem('cms_content');
    localStorage.removeItem('cms_assignments');
    localStorage.removeItem('cms_activity');
    localStorage.removeItem('cms_query_history');
    localStorage.removeItem('groq_api_key');
    localStorage.removeItem('groq_model');
    localStorage.removeItem('groq_temp');
  }, []);

  const loadDemoData = useCallback(() => {
    setConnections(DEMO_CONNECTIONS);
    setContent(DEMO_CONTENT);
    setAssignments([]);
    setActivityLog([]);
    logActivity('Demo Data Loaded', 'Loaded demo connections and content');
  }, [logActivity]);

  const exportData = useCallback(() => {
    const data = {
      connections,
      content,
      assignments,
      activityLog,
      queryHistory,
      groq: {
        model: localStorage.getItem('groq_model'),
        temp: localStorage.getItem('groq_temp')
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cms-nexus-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [connections, content, assignments, activityLog, queryHistory]);

  const importData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.connections) setConnections(parsed.connections);
      if (parsed.content) setContent(parsed.content);
      if (parsed.assignments) setAssignments(parsed.assignments);
      if (parsed.activityLog) setActivityLog(parsed.activityLog);
      if (parsed.queryHistory) setQueryHistory(parsed.queryHistory);
      if (parsed.groq) {
        if (parsed.groq.model) localStorage.setItem('groq_model', parsed.groq.model);
        if (parsed.groq.temp) localStorage.setItem('groq_temp', parsed.groq.temp);
      }
      logActivity('Data Imported', 'Successfully imported data from file');
      return true;
    } catch {
      return false;
    }
  }, [logActivity]);

  const syncLiveContent = useCallback(async (cmsId: string): Promise<{ added: number; updated: number }> => {
    const connection = connections.find(c => c.id === cmsId);
    if (!connection) throw new Error('Connection not found');

    const endpoint = CMS_ENDPOINTS[connection.type];
    if (!endpoint) throw new Error('Unsupported CMS type');

    let body: Record<string, string> = {
      siteUrl: connection.url,
      dataType: 'all',
    };

    if (connection.type === 'wordpress' || connection.type === 'drupal') {
      const [user, pwd] = connection.apiKey.includes(':')
        ? connection.apiKey.split(':')
        : ['admin', connection.apiKey];
      body.username = user;
      body[connection.type === 'wordpress' ? 'appPassword' : 'password'] = pwd;
    } else {
      body.apiToken = connection.apiKey;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const data = result.data || {};

    // Collect all post-like items from the response
    const rawItems: any[] = [];
    const postKeys = ['posts', 'pages', 'articles'];
    for (const key of postKeys) {
      if (Array.isArray(data[key])) rawItems.push(...data[key]);
    }

    // Map raw items to ContentItem
    const now = new Date().toISOString();
    const mapped: ContentItem[] = rawItems.map((item: any) => {
      const title =
        typeof item.title === 'object' ? (item.title?.rendered || 'Untitled') :
        typeof item.title === 'string' ? item.title :
        item.name || 'Untitled';

      const body = typeof item.content === 'object'
        ? (item.content?.rendered || '')
        : (item.excerpt?.rendered || item.content || item.summary || '');
      
      // Strip HTML tags for plain text
      const plainBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const statusRaw = item.status || 'draft';
      const status: ContentItem['status'] =
        statusRaw === 'publish' || statusRaw === 'published' ? 'published' :
        statusRaw === 'pending' ? 'pending' : 'draft';

      return {
        id: `live_${cmsId}_${item.id || Math.random().toString(36).slice(2)}`,
        cmsId,
        title,
        body: plainBody || title,
        author: typeof item.author === 'string' ? item.author : (item._embedded?.author?.[0]?.name || ''),
        status,
        date: item.date || item.created || now,
        tags: Array.isArray(item.tags) ? item.tags.map((t: any) => typeof t === 'string' ? t : t.name || '').filter(Boolean) : [],
        wordCount: plainBody.split(/\s+/).filter(Boolean).length,
      };
    });

    // Remove old live items for this cmsId, add new ones
    let added = 0;
    let updated = 0;
    setContent(prev => {
      const withoutOld = prev.filter(c => !(c.id.startsWith(`live_${cmsId}_`)));
      const existing = prev.filter(c => c.id.startsWith(`live_${cmsId}_`));
      updated = Math.min(existing.length, mapped.length);
      added = Math.max(0, mapped.length - existing.length);
      return [...withoutOld, ...mapped];
    });

    logActivity('Live Sync', `Synced ${mapped.length} items from ${connection.name}`);
    return { added, updated };
  }, [connections, logActivity]);

  return {
    connections,
    content,
    assignments,
    activityLog,
    queryHistory,
    isLoaded,
    addConnection,
    removeConnection,
    loadSampleContent,
    updateContent,
    addAssignment,
    updateAssignment,
    addQueryToHistory,
    clearAllData,
    loadDemoData,
    exportData,
    importData,
    logActivity,
    syncLiveContent
  };
}
