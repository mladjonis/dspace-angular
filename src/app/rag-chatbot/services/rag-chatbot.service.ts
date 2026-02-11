import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatRequest } from '../models/chat-request.model';
import { ChatResponse } from '../models/chat-response.model';
import { APP_CONFIG, AppConfig } from '../../../config/app-config.interface';

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

  chat(query: string, page?: number, pageSize?: number): Observable<ChatResponse> {
    const request: ChatRequest = {
      query,
      page,
      page_size: pageSize
    };

    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
  }

  healthCheck(): Observable<{ status: string; service: string }> {
    return this.http.get<{ status: string; service: string }>(`${this.apiUrl}/health`);
  }
}

