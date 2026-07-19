export interface Citation {
  document_index: number;

  quote: string;

  verified?: boolean;
}

export interface ChatResponse {
  success: boolean;

  response: string;

  documents: DocumentResult[];

  query: string;

  num_docs_found: number;

  pagination: PaginationInfo;

  citations?: Citation[];

  no_answer?: boolean;

  error?: string;
}

export interface DocumentResult {
  content: string;

  metadata: { [key: string]: any };

  similarity_score: number;

  solr_id: string;

  num_chunks?: number;

  total_chunks_expected?: number;
}

export interface PaginationInfo {
  page: number;

  page_size: number;

  total_results: number;

  has_more: boolean;

  total_results_is_approximate?: boolean;
}
