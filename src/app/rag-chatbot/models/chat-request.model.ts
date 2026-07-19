export interface ApiChatMessage {
  role: 'system' | 'user' | 'assistant';

  content: string;
}

export interface ChatRequest {
  messages: ApiChatMessage[];

  page?: number;

  page_size?: number;
}
