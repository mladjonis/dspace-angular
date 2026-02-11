import { DocumentResult, PaginationInfo } from './chat-response.model';

export interface ChatMessage {
  id: string;

  content: string;

  type: 'user' | 'bot';

  timestamp: Date;

  documents?: DocumentResult[];

  loading?: boolean;

  error?: string;

  numDocsFound?: number;

  pagination?: PaginationInfo;

  originalQuery?: string;

  loadingMore?: boolean;
}
