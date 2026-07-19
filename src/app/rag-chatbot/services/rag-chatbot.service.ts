import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiChatMessage, ChatRequest } from '../models/chat-request.model';
import { ChatResponse } from '../models/chat-response.model';
import { APP_CONFIG, AppConfig } from '../../../config/app-config.interface';

const DEFAULT_CHAT_PAGE = 1;
const DEFAULT_CHAT_PAGE_SIZE = 10;

export interface RagHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';

  service: string;

  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RagChatbotService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(APP_CONFIG) protected appConfig: AppConfig
  ) {
    this.apiUrl = `${this.appConfig.rest.baseUrl}/api/rag`;
  }

  chatWithHistory(
    messages: ApiChatMessage[],
    page?: number,
    pageSize?: number
  ): Observable<ChatResponse> {
    const request: ChatRequest = {
      messages,
      page: page ?? DEFAULT_CHAT_PAGE,
      page_size: pageSize ?? DEFAULT_CHAT_PAGE_SIZE,
    };
    return this.postChat(request);
  }

  healthCheck(): Observable<RagHealthResponse> {
    return this.http.get<RagHealthResponse>(`${this.apiUrl}/health`);
  }

  private postChat(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }
}
