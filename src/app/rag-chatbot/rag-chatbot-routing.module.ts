import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RagChatbotComponent } from './rag-chatbot.component';

const routes: Routes = [
  {
    path: '',
    component: RagChatbotComponent,
    data: {
      title: 'rag-chatbot.page.title',
      showBreadcrumbs: true
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RagChatbotRoutingModule { }

