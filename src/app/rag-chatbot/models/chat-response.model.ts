export interface ChatResponse {
  success: boolean;

  response: string;

  documents: DocumentResult[];

  query: string;

  num_docs_found: number;

  pagination: PaginationInfo;

  error?: string;
}

export interface DocumentResult {
  content: string;

  title?: string;

  description?: string;

  fulltext_preview?: string;

  metadata: { [key: string]: any };

  distance: number;

  solr_id: string;

  num_chunks?: number;
}

export interface PaginationInfo {
  page: number;

  page_size: number;

  total_results: number;

  has_more: boolean;
}

