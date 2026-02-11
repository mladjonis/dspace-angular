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

  describe('chat', () => {
    it('should send a chat query', () => {
      const mockResponse: ChatResponse = {
        success: true,
        response: 'Test response',
        documents: [],
        query: 'test query',
        num_docs_found: 0,
        pagination: {
          page: 1,
          page_size: 10,
          total_results: 0,
          has_more: false
        }
      };

      service.chat('test query').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8080/server/api/rag/chat');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ query: 'test query' });
      req.flush(mockResponse);
    });

    it('should include pagination parameters', () => {
      service.chat('test query', 2, 5).subscribe();

      const req = httpMock.expectOne('http://localhost:8080/server/api/rag/chat');
      expect(req.request.body).toEqual({
        query: 'test query',
        page: 2,
        page_size: 5
      });
      req.flush({} as ChatResponse);
    });
  });

  describe('healthCheck', () => {
    it('should check service health', () => {
      const mockResponse = { status: 'healthy', service: 'RAG Chatbot' };

      service.healthCheck().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:8080/server/api/rag/health');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});

