import { Citation, DocumentResult, PaginationInfo } from './chat-response.model';

export interface ChatMessage {
  id: string;

  content: string;

  type: 'user' | 'bot';

  timestamp: Date;

  documents?: DocumentResult[];

  citations?: Citation[];

  loading?: boolean;

  error?: string;

  numDocsFound?: number;

  pagination?: PaginationInfo;

  originalQuery?: string;

  loadingMore?: boolean;

  loadMoreNotice?: string;

  noAnswer?: boolean;

  isWelcome?: boolean;
}
