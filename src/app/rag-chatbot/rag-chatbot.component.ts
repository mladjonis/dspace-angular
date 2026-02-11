import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RagChatbotService } from './services/rag-chatbot.service';
import { ChatMessage } from './models/chat-message.model';
import { DocumentResult } from './models/chat-response.model';

@Component({
  selector: 'ds-rag-chatbot',
  templateUrl: './rag-chatbot.component.html',
  styleUrls: ['./rag-chatbot.component.scss']
})
export class RagChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  private shouldScrollToBottom = false;

  private destroy$ = new Subject<void>();

  @ViewChild('messagesContainer') private messagesContainer: ElementRef;

  messages: ChatMessage[] = [];

  userInput = '';

  isLoading = false;

  isServiceHealthy = true;

  serviceError: string;

  showDocuments = true;

  selectedDocument: DocumentResult | null = null;

  constructor(
    private ragChatbotService: RagChatbotService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkServiceHealth();
    this.addWelcomeMessage();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
    }
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkServiceHealth(): void {
    this.ragChatbotService.healthCheck()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isServiceHealthy = response.status === 'healthy';
          if (!this.isServiceHealthy) {
            this.serviceError = 'RAG Chatbot service is not available';
          }
        },
        error: (error) => {
          this.isServiceHealthy = false;
          this.serviceError = 'Unable to connect to RAG Chatbot service';
          console.error('Health check failed:', error);
        }
      });
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      //TODO: translate content json5
      content: 'Hello! I\'m your DSpace AI assistant. I can help you search and explore documents in the repository using natural language. Try asking me questions like:\n\n' +
        '• "Find papers about machine learning"\n' +
        '• "What documents discuss climate change?"\n' +
        '• "Show me research on artificial intelligence"\n' +
        '• "Papers about renewable energy from 2023"\n\n' +
        'What would you like to know?',
      type: 'bot',
      timestamp: new Date()
    };
    this.messages.push(welcomeMessage);
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const query = this.userInput.trim();
    this.userInput = '';

    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: query,
      type: 'user',
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    this.shouldScrollToBottom = true;

    const loadingMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: 'Searching repository...', //TODO: translate, json5
      type: 'bot',
      timestamp: new Date(),
      loading: true
    };
    this.messages.push(loadingMessage);
    this.shouldScrollToBottom = true;

    this.isLoading = true;

    this.ragChatbotService.chat(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messages = this.messages.filter(m => !m.loading);

          const botMessage: ChatMessage = {
            id: this.generateMessageId(),
            content: response.response,
            type: 'bot',
            timestamp: new Date(),
            documents: response.documents,
            numDocsFound: response.pagination?.total_results || response.num_docs_found,
            pagination: response.pagination,
            originalQuery: query
          };
          this.messages.push(botMessage);
          this.shouldScrollToBottom = true;
          this.isLoading = false;
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Chat error:', error);
          
          this.messages = this.messages.filter(m => !m.loading);

          const errorMessage: ChatMessage = {
            id: this.generateMessageId(),
            content: 'Sorry, I encountered an error processing your request. Please try again.',
            type: 'bot',
            timestamp: new Date(),
            error: error.error?.error || error.message
          };
          this.messages.push(errorMessage);
          this.shouldScrollToBottom = true;
          this.isLoading = false;
          
          this.cdr.detectChanges();
        }
      });
  }

  loadMoreDocuments(message: ChatMessage): void {
    if (!message.pagination || !message.pagination.has_more || message.loadingMore) {
      return;
    }

    const nextPage = message.pagination.page + 1;
    message.loadingMore = true;
    this.cdr.detectChanges();

    this.ragChatbotService.chat(message.originalQuery, nextPage, message.pagination.page_size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          message.documents = [...(message.documents || []), ...response.documents];
          message.pagination = response.pagination;
          message.loadingMore = false;
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Load more error:', error);
          message.loadingMore = false;
          this.cdr.detectChanges();
        }
      });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages = [];
    this.addWelcomeMessage();
  }

  toggleDocuments(): void {
    this.showDocuments = !this.showDocuments;
  }

  viewDocument(document: DocumentResult): void {
    this.selectedDocument = document;
  }

  closeDocumentDetails(): void {
    this.selectedDocument = null;
  }

  navigateToItem(solrId: string): void {
    // Extract UUID from solr_id (format: Item-UUID or similar)
    const uuid = solrId.replace(/^Item-/, '');
    window.open(`/items/${uuid}`, '_blank');
  }

  getMetadataValue(metadata: any, key: string): string {
    const value = metadata[key];
    if (!value) {
      return 'N/A';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTruncatedContent(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}

