export type CMSType = 'wordpress' | 'drupal' | 'joomla';

export interface CMSConnection {
  id: string;
  name: string;
  type: CMSType;
  url: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
}

export interface ContentItem {
  id: string;
  cmsId: string;
  title: string;
  body: string;
  author: string;
  status: 'published' | 'draft' | 'pending';
  date: string;
  tags: string[];
  wordCount: number;
}

export interface Assignment {
  id: string;
  contentId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: string;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface QueryHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}
