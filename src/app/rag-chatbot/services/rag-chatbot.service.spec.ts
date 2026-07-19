import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RagChatbotService } from './rag-chatbot.service';
import { ChatResponse } from '../models/chat-response.model';
import { APP_CONFIG } from '../../../config/app-config.interface';

describe('RagChatbotService', () => {
  let service: RagChatbotService;
  let httpMock: HttpTestingController;

  const mockAppConfig = {
    rest: {
      baseUrl: 'http://localhost:8080/server'
    }
  };

  const mockResponse: ChatResponse = {
    success: true,
    response: 'Test response',
    documents: [],
    query: 'test query',
    num_docs_found: 0,
    citations: [{ document_index: 1, quote: 'A quote', verified: true }],
    no_answer: false,
    pagination: {
      page: 1,
      page_size: 10,
      total_results: 0,
      has_more: false,
      total_results_is_approximate: false
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RagChatbotService,
        { provide: APP_CONFIG, useValue: mockAppConfig }
      ]
    });
    service = TestBed.inject(RagChatbotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('chatWithHistory', () => {
    it('should send messages', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi' },
        { role: 'user' as const, content: 'Follow up' }
      ];

      service.chatWithHistory(messages).subscribe(response => {
        expect(response.citations?.length).toBe(1);
      });

      const req = httpMock.expectOne('http://localhost:8080/server/api/rag/chat');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        messages,
        page: 1,
        page_size: 10
      });
      req.flush(mockResponse);
    });

    it('should include pagination parameters', () => {
      const messages = [{ role: 'user' as const, content: 'test query' }];

      service.chatWithHistory(messages, 2, 5).subscribe();

      const req = httpMock.expectOne('http://localhost:8080/server/api/rag/chat');
      expect(req.request.body).toEqual({
        messages,
        page: 2,
        page_size: 5
      });
      req.flush(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('should check service health', () => {
      const mockHealth = { status: 'degraded' as const, service: 'DSpace RAG Chatbot' };

      service.healthCheck().subscribe(response => {
        expect(response).toEqual(mockHealth);
      });

      const req = httpMock.expectOne('http://localhost:8080/server/api/rag/health');
      expect(req.request.method).toBe('GET');
      req.flush(mockHealth);
    });
  });
});
