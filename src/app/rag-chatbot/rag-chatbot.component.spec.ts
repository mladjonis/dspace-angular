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

  beforeEach(async () => {
    mockRagChatbotService = jasmine.createSpyObj('RagChatbotService', [
      'chat',
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

  it('should add welcome message on init', () => {
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    expect(component.messages.length).toBeGreaterThan(0);
    expect(component.messages[0].type).toBe('bot');
  });

  it('should send message', () => {
    const mockResponse = {
      success: true,
      response: 'Test response',
      documents: [],
      query: 'test',
      num_docs_found: 0,
      pagination: {
        page: 1,
        page_size: 10,
        total_results: 0,
        has_more: false
      }
    };

    mockRagChatbotService.chat.and.returnValue(of(mockResponse));
    mockRagChatbotService.healthCheck.and.returnValue(
      of({ status: 'healthy', service: 'RAG Chatbot' })
    );

    fixture.detectChanges();

    component.userInput = 'test query';
    component.sendMessage();

    expect(mockRagChatbotService.chat).toHaveBeenCalledWith('test query');
    expect(component.userInput).toBe('');
  });

  it('should handle error when sending message', () => {
    mockRagChatbotService.chat.and.returnValue(
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

    expect(mockRagChatbotService.chat).not.toHaveBeenCalled();
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

    expect(component.messages.length).toBe(1); // Only welcome message
  });
});

