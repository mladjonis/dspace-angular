import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RagChatbotService } from './services/rag-chatbot.service';
import { ApiChatMessage } from './models/chat-request.model';
import { ChatMessage } from './models/chat-message.model';
import { ChatResponse, DocumentResult } from './models/chat-response.model';

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

  isServiceDegraded = false;

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
          this.isServiceHealthy =
            response.status === 'healthy' || response.status === 'degraded';
          this.isServiceDegraded = response.status === 'degraded';
          if (!this.isServiceHealthy) {
            this.serviceError = 'RAG Chatbot service is not available';
          } else if (this.isServiceDegraded) {
            this.serviceError = 'RAG Chatbot service is running in degraded mode';
          }
        },
        error: (error) => {
          this.isServiceHealthy = false;
          this.isServiceDegraded = false;
          this.serviceError = 'Unable to connect to RAG Chatbot service';
          console.error('Health check failed:', error);
        }
      });
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: 'Hello! I\'m your DSpace AI assistant. I can help you search and explore documents in the repository using natural language. Try asking me questions like:\n\n' +
        '• "Find papers about machine learning"\n' +
        '• "What documents discuss climate change?"\n' +
        '• "Show me research on artificial intelligence"\n' +
        '• "Papers about renewable energy from 2023"\n\n' +
        'What would you like to know?',
      type: 'bot',
      timestamp: new Date(),
      isWelcome: true
    };
    this.messages.push(welcomeMessage);
  }

  buildApiMessages(): ApiChatMessage[] {
    return this.messages
      .filter(m =>
        !m.loading &&
        !m.error &&
        !m.isWelcome &&
        (m.type === 'user' || m.type === 'bot')
      )
      .map(m => ({
        role: m.type === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content
      }));
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
      content: 'Searching repository...',
      type: 'bot',
      timestamp: new Date(),
      loading: true
    };
    this.messages.push(loadingMessage);
    this.shouldScrollToBottom = true;

    this.isLoading = true;

    this.ragChatbotService.chatWithHistory(this.buildApiMessages())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleChatResponse(response, query),
        error: (error) => this.handleChatError(error)
      });
  }

  private handleChatResponse(response: ChatResponse, originalQuery: string): void {
    this.messages = this.messages.filter(m => !m.loading);

    const botMessage: ChatMessage = {
      id: this.generateMessageId(),
      content: response.response,
      type: 'bot',
      timestamp: new Date(),
      documents: response.documents,
      citations: response.citations,
      numDocsFound: response.pagination?.total_results ?? response.num_docs_found,
      pagination: response.pagination,
      originalQuery,
      noAnswer: response.no_answer === true
    };
    this.messages.push(botMessage);
    this.shouldScrollToBottom = true;
    this.isLoading = false;

    this.cdr.detectChanges();
  }

  private handleChatError(error: any): void {
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

  loadMoreDocuments(message: ChatMessage): void {
    if (!message.pagination || !message.pagination.has_more || message.loadingMore) {
      return;
    }

    if (!message.originalQuery) {
      return;
    }

    const nextPage = message.pagination.page + 1;
    message.loadingMore = true;
    this.cdr.detectChanges();

    this.ragChatbotService.chatWithHistory(
      [{ role: 'user', content: message.originalQuery }],
      nextPage,
      message.pagination.page_size
    )
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

  viewCitationDocument(message: ChatMessage, documentIndex: number): void {
    const doc = this.getDocumentByCitationIndex(message, documentIndex);
    if (doc) {
      this.viewDocument(doc);
    }
  }

  getDocumentByCitationIndex(message: ChatMessage, documentIndex: number): DocumentResult | null {
    if (!message.documents || documentIndex < 1) {
      return null;
    }
    return message.documents[documentIndex - 1] ?? null;
  }

  navigateToItem(solrId: string): void {
    const uuid = solrId.replace(/^Item-/, '');
    window.open(`/items/${uuid}`, '_blank');
  }

  getMetadataValue(metadata: Record<string, unknown> | undefined, key: string): string {
    if (!metadata) {
      return 'N/A';
    }
    const value = metadata[key];
    if (!value) {
      return 'N/A';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }

  getDocumentTitle(doc: DocumentResult): string {
    const title = this.getMetadataValue(doc.metadata, 'dc_title');
    return title !== 'N/A' ? title : 'Untitled Document';
  }

  getDocumentAbstract(doc: DocumentResult): string | null {
    const abstract = this.getMetadataValue(doc.metadata, 'dc_description_abstract');
    return abstract !== 'N/A' ? abstract : null;
  }

  getDocumentAuthor(doc: DocumentResult): string | null {
    const value = this.getMetadataValue(doc.metadata, 'author');
    return value !== 'N/A' ? value : null;
  }

  getDocumentDate(doc: DocumentResult): string | null {
    const value = this.getMetadataValue(doc.metadata, 'dc_date_issued_dt');
    return value !== 'N/A' ? value : null;
  }

  formatTotalResults(message: ChatMessage): string {
    const total = message.numDocsFound ?? 0;
    if (message.pagination?.total_results_is_approximate) {
      return `~${total}`;
    }
    return String(total);
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTruncatedContent(content: string, maxLength: number = 200): string {
    if (!content || content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}
