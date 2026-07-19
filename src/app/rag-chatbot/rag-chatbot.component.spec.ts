import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { RagChatbotComponent } from './rag-chatbot.component';
import { RagChatbotService } from './services/rag-chatbot.service';
import { SafePipe } from './pipes/safe.pipe';

describe('RagChatbotComponent', () => {
  let component: RagChatbotComponent;
  let fixture: ComponentFixture<RagChatbotComponent>;
  let mockRagChatbotService: jasmine.SpyObj<RagChatbotService>;

  const mockResponse = {
    success: true,
    response: 'Test response',
    documents: [{
      content: 'doc content',
      metadata: { dc_title: 'Test Paper', author: ['Author'] },
      similarity_score: 0.9,
      solr_id: 'Item-abc'
    }],
    query: 'test',
    num_docs_found: 1,
    citations: [{ document_index: 1, quote: 'A quote', verified: true }],
    no_answer: false,
    pagination: {
      page: 1,
      page_size: 10,
      total_results: 1,
      has_more: false,
      total_results_is_approximate: false
    }
  };

  beforeEach(async () => {
    mockRagChatbotService = jasmine.createSpyObj('RagChatbotService', [
      'chatWithHistory',
      'healthCheck'
    ]);

    await TestBed.configureTestingModule({
      declarations: [RagChatbotComponent, SafePipe],
      imports: [FormsModule],
      providers: [
        { provide: RagChatbotService, useValue: mockRagChatbotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RagChatbotComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check service health on init', () => {
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    expect(mockRagChatbotService.healthCheck).toHaveBeenCalled();
    expect(component.isServiceHealthy).toBe(true);
  });

  it('should treat degraded status as healthy', () => {
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'degraded', service: 'DSpace RAG Chatbot' })
    );

    fixture.detectChanges();

    expect(component.isServiceHealthy).toBe(true);
    expect(component.isServiceDegraded).toBe(true);
  });

  it('should add welcome message on init', () => {
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    expect(component.messages.length).toBeGreaterThan(0);
    expect(component.messages[0].type).toBe('bot');
    expect(component.messages[0].isWelcome).toBe(true);
  });

  it('should send message via chatWithHistory', () => {
    mockRagChatbotService.chatWithHistory.and.returnValue(of(mockResponse));
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    component.userInput = 'test query';
    component.sendMessage();

    expect(mockRagChatbotService.chatWithHistory).toHaveBeenCalled();
    const apiMessages = mockRagChatbotService.chatWithHistory.calls.mostRecent().args[0];
    expect(apiMessages.some(m => m.role === 'user' && m.content === 'test query')).toBe(true);
    expect(component.userInput).toBe('');
  });

  it('should store citations and noAnswer on response', () => {
    mockRagChatbotService.chatWithHistory.and.returnValue(of(mockResponse));
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    component.userInput = 'test query';
    component.sendMessage();

    const botMessage = component.messages[component.messages.length - 1];
    expect(botMessage.citations?.length).toBe(1);
    expect(botMessage.noAnswer).toBe(false);
  });

  it('should handle error when sending message', () => {
    mockRagChatbotService.chatWithHistory.and.returnValue(
      throwError(() => new Error('Test error'))
    );
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    const initialLength = component.messages.length;
    component.userInput = 'test query';
    component.sendMessage();

    expect(component.messages.length).toBeGreaterThan(initialLength);
    const lastMessage = component.messages[component.messages.length - 1];
    expect(lastMessage.error).toBeDefined();
  });

  it('should not send empty message', () => {
    component.userInput = '   ';
    component.sendMessage();

    expect(mockRagChatbotService.chatWithHistory).not.toHaveBeenCalled();
  });

  it('should clear chat', () => {
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    component.messages.push({
      id: '1',
      content: 'test',
      type: 'user',
      timestamp: new Date()
    });

    component.clearChat();

    expect(component.messages.length).toBe(1);
  });

  it('should resolve document title from metadata', () => {
    const title = component.getDocumentTitle(mockResponse.documents[0]);
    expect(title).toBe('Test Paper');
  });

  it('should load more documents via chatWithHistory with messages', () => {
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );
    mockRagChatbotService.chatWithHistory.and.returnValue(of({
      ...mockResponse,
      documents: [{
        content: 'page 2 doc',
        metadata: { dc_title: 'Page 2 Paper' },
        similarity_score: 0.8,
        solr_id: 'Item-def'
      }],
      pagination: {
        page: 2,
        page_size: 10,
        total_results: 2,
        has_more: false,
        total_results_is_approximate: false
      }
    }));

    fixture.detectChanges();

    const message = {
      id: 'bot-1',
      content: 'Results',
      type: 'bot' as const,
      timestamp: new Date(),
      originalQuery: 'test query',
      documents: mockResponse.documents,
      pagination: {
        page: 1,
        page_size: 10,
        total_results: 2,
        has_more: true,
        total_results_is_approximate: false
      }
    };

    component.loadMoreDocuments(message);

    expect(mockRagChatbotService.chatWithHistory).toHaveBeenCalledWith(
      [{ role: 'user', content: 'test query' }],
      2,
      10
    );
    expect(message.documents?.length).toBe(2);
    expect(message.pagination?.page).toBe(2);
  });
});
