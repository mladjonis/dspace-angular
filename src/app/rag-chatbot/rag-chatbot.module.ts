import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { RagChatbotRoutingModule } from './rag-chatbot-routing.module';
import { RagChatbotComponent } from './rag-chatbot.component';
import { RagChatbotService } from './services/rag-chatbot.service';
import { SafePipe } from './pipes/safe.pipe';


@NgModule({
  declarations: [
    RagChatbotComponent,
    SafePipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RagChatbotRoutingModule
  ],
  providers: [
    RagChatbotService
  ]
})
export class RagChatbotModule { }

