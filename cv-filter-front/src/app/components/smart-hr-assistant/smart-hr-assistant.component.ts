import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ChatCandidateResponse,
  ChatResponse,
  ChatService
} from '../../services/chat.service';

type ChatRole = 'user' | 'bot';

interface ChatMessage {
  role: ChatRole;
  text: string;
  explanation?: string;
  candidates?: ChatCandidateResponse[];
}

@Component({
  selector: 'app-smart-hr-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="assistant-fab" (click)="togglePanel()" [class.open]="open" title="Smart HR Assistant">
      <span>AI</span>
      @if (!open) {
        <small>HR</small>
      }
    </button>

    @if (open) {
      <section class="assistant-panel" [class.expanded]="expanded">
        <header class="assistant-header">
          <div class="assistant-title">
            <div class="assistant-mark">AI</div>
            <div>
              <p>Smart HR Assistant</p>
              <span>{{ selectedCandidateId ? 'Candidate context active' : 'Search, shortlist, summarize' }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="icon-btn" (click)="clearChat()" title="New chat">New</button>
            <button class="icon-btn" (click)="toggleExpanded()" title="Resize">{{ expanded ? 'Min' : 'Max' }}</button>
            <button class="icon-btn" (click)="togglePanel()" title="Close">x</button>
          </div>
        </header>

        @if (selectedCandidateId) {
          <div class="context-strip">
            <span>Candidate selected for follow-up questions</span>
            <button (click)="selectedCandidateId = null">Clear context</button>
          </div>
        }

        <div class="messages" #messageList>
          @for (message of messages; track $index) {
            <article class="message" [class.user]="message.role === 'user'">
              <p>{{ message.text }}</p>

              @if (message.explanation) {
                <div class="explanation">{{ message.explanation }}</div>
              }

              @if (message.candidates?.length) {
                <div class="candidate-stack">
                  @for (item of message.candidates; track item.candidate.id) {
                    <button class="candidate-card" (click)="selectCandidate(item)">
                      <div class="candidate-head">
                        <strong>{{ item.candidate.fullName || 'Unknown candidate' }}</strong>
                        @if (item.candidate.aiMatchScore !== null) {
                          <span>{{ item.candidate.aiMatchScore }}%</span>
                        }
                      </div>
                      <small>{{ item.candidate.currentJobTitle || 'No job title' }}</small>
                      <div class="chips">
                        @for (skill of topSkills(item); track skill) {
                          <em>{{ skill }}</em>
                        }
                      </div>
                      <ul>
                        @for (reason of item.reasons.slice(0, 3); track reason) {
                          <li>{{ reason }}</li>
                        }
                      </ul>
                    </button>
                    <div class="candidate-actions">
                      <button (click)="selectCandidate(item)">Summarize</button>
                      <button (click)="askAbout(item, 'What are the strengths and risks for this candidate?')">Risks</button>
                      <button (click)="openCandidate(item)">Open</button>
                    </div>
                  }
                </div>
              }
            </article>
          }

          @if (loading) {
            <article class="message">
              <p>Thinking through the candidate data...</p>
            </article>
          }
        </div>

        <div class="quick-actions">
          <button (click)="usePrompt('Find me a senior Java backend developer')">Senior Java</button>
          <button (click)="usePrompt('Junior Angular intern')">Angular intern</button>
          <button (click)="usePrompt('Find profiles with Docker and Spring Boot')">Docker + Spring</button>
          <button (click)="usePrompt('Compare the last candidates by skills and experience')">Compare</button>
          <button (click)="usePrompt('Summarize this candidate')">Summarize</button>
        </div>

        <form class="composer" (ngSubmit)="sendMessage()">
          <input
            [(ngModel)]="draft"
            name="assistantMessage"
            placeholder="Ask for a candidate profile..."
            [disabled]="loading" />
          <button type="submit" [disabled]="loading || !draft.trim()">Send</button>
        </form>
      </section>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 2200;
      color: var(--text);
    }

    .assistant-fab {
      width: 62px;
      height: 62px;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      color: white;
      font-weight: 900;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 18px 40px rgba(6, 182, 212, 0.28);
      display: grid;
      place-items: center;
      gap: 0;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .assistant-fab:hover,
    .assistant-fab.open {
      transform: translateY(-2px);
      box-shadow: 0 22px 48px rgba(6, 182, 212, 0.34);
    }

    .assistant-fab span {
      font-size: 18px;
      line-height: 1;
    }

    .assistant-fab small {
      font-size: 11px;
      line-height: 1;
      opacity: 0.88;
    }

    .assistant-panel {
      position: absolute;
      right: 0;
      bottom: 72px;
      width: min(430px, calc(100vw - 28px));
      height: min(680px, calc(100vh - 110px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 22px;
      background: color-mix(in srgb, var(--bg-2) 92%, white 8%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
    }

    .assistant-panel.expanded {
      width: min(760px, calc(100vw - 28px));
      height: min(780px, calc(100vh - 72px));
    }

    :host-context(.light-theme-root) .assistant-panel {
      background: rgba(255, 255, 255, 0.96);
      border-color: rgba(15, 23, 42, 0.1);
    }

    .assistant-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .assistant-title,
    .header-actions,
    .context-strip,
    .candidate-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .assistant-mark {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      font-weight: 900;
      flex: 0 0 auto;
    }

    .assistant-header p {
      margin: 0 0 4px;
      color: var(--heading);
      font-weight: 900;
    }

    .assistant-header span {
      color: var(--muted);
      font-size: 12px;
    }

    .icon-btn {
      min-width: 34px;
      height: 34px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      color: var(--text);
      background: rgba(148, 163, 184, 0.14);
      font-weight: 900;
      padding: 0 10px;
      font-size: 12px;
    }

    .context-strip {
      justify-content: space-between;
      padding: 10px 14px;
      color: var(--muted);
      background: rgba(34, 197, 94, 0.1);
      border-bottom: 1px solid rgba(34, 197, 94, 0.18);
      font-size: 12px;
      font-weight: 800;
    }

    .context-strip button {
      border: none;
      cursor: pointer;
      color: var(--heading);
      background: transparent;
      font-weight: 900;
    }

    .messages {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      max-width: 92%;
      align-self: flex-start;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    :host-context(.light-theme-root) .message {
      background: rgba(15, 23, 42, 0.04);
      border-color: rgba(15, 23, 42, 0.08);
    }

    .message.user {
      align-self: flex-end;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      border: none;
    }

    .message p {
      margin: 0;
      line-height: 1.45;
    }

    .explanation {
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .candidate-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }

    .candidate-card {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 14px;
      padding: 12px;
      cursor: pointer;
      color: var(--text);
      background: rgba(15, 23, 42, 0.16);
    }

    :host-context(.light-theme-root) .candidate-card {
      background: rgba(255, 255, 255, 0.72);
    }

    .candidate-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--heading);
    }

    .candidate-head span {
      flex-shrink: 0;
      padding: 6px 9px;
      border-radius: 999px;
      color: white;
      font-size: 12px;
      font-weight: 900;
      background: linear-gradient(135deg, #22c55e, #06b6d4);
    }

    .candidate-card small {
      display: block;
      margin-top: 4px;
      color: var(--muted);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }

    .chips em {
      padding: 5px 8px;
      border-radius: 999px;
      color: #c7d2fe;
      background: rgba(79, 70, 229, 0.18);
      font-style: normal;
      font-size: 12px;
      font-weight: 700;
    }

    :host-context(.light-theme-root) .chips em {
      color: #4338ca;
    }

    .candidate-card ul {
      margin: 10px 0 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .candidate-actions {
      justify-content: flex-end;
      margin-top: -4px;
    }

    .candidate-actions button {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      padding: 7px 10px;
      cursor: pointer;
      color: var(--text);
      background: rgba(148, 163, 184, 0.12);
      font-size: 12px;
      font-weight: 800;
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      padding: 10px 14px 0;
      overflow-x: auto;
    }

    .quick-actions button {
      white-space: nowrap;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      padding: 8px 10px;
      cursor: pointer;
      color: var(--text);
      background: rgba(148, 163, 184, 0.12);
      font-weight: 700;
      font-size: 12px;
    }

    .composer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      padding: 14px;
    }

    .composer input {
      min-width: 0;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      padding: 12px 13px;
      color: var(--text);
      background: rgba(255, 255, 255, 0.06);
      outline: none;
    }

    :host-context(.light-theme-root) .composer input {
      background: rgba(255, 255, 255, 0.76);
    }

    .composer button {
      border: none;
      border-radius: 14px;
      padding: 0 15px;
      cursor: pointer;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      font-weight: 900;
    }

    .composer button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    @media (max-width: 640px) {
      :host {
        right: 14px;
        bottom: 14px;
      }

      .assistant-panel.expanded {
        width: calc(100vw - 28px);
        height: calc(100vh - 92px);
      }
    }
  `]
})
export class SmartHrAssistantComponent implements AfterViewChecked {
  private chatService = inject(ChatService);
  private router = inject(Router);
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  open = false;
  expanded = false;
  loading = false;
  private shouldScrollToBottom = true;
  draft = '';
  conversationId: string | null = null;
  selectedCandidateId: string | null = null;
  messages: ChatMessage[] = [
    {
      role: 'bot',
      text: 'Hi, I am your Smart HR Assistant. Ask me for candidates by skill, seniority, role, or experience.'
    }
  ];

  togglePanel(): void {
    this.open = !this.open;
    this.shouldScrollToBottom = this.open;
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    this.shouldScrollToBottom = true;
  }

  clearChat(): void {
    this.conversationId = null;
    this.selectedCandidateId = null;
    this.draft = '';
    this.messages = [
      {
        role: 'bot',
        text: 'New chat started. Ask for candidates, comparisons, risks, or interview preparation.'
      }
    ];
    this.shouldScrollToBottom = true;
  }

  usePrompt(prompt: string): void {
    this.draft = prompt;
    this.sendMessage();
  }

  sendMessage(): void {
    const message = this.draft.trim();
    if (!message || this.loading) {
      return;
    }

    this.messages = [...this.messages, { role: 'user', text: message }];
    this.shouldScrollToBottom = true;
    this.draft = '';
    this.loading = true;

    this.chatService.send({
      message,
      conversationId: this.conversationId,
      selectedCandidateId: this.selectedCandidateId
    }).subscribe({
      next: (response) => this.handleResponse(response),
      error: () => {
        this.loading = false;
        this.messages = [
          ...this.messages,
          {
            role: 'bot',
            text: 'I could not reach the assistant service. Please check the backend and try again.'
          }
        ];
        this.shouldScrollToBottom = true;
      }
    });
  }

  selectCandidate(item: ChatCandidateResponse): void {
    this.selectedCandidateId = item.candidate.id;
    this.draft = `Summarize ${item.candidate.fullName}`;
    this.sendMessage();
  }

  askAbout(item: ChatCandidateResponse, question: string): void {
    this.selectedCandidateId = item.candidate.id;
    this.draft = question;
    this.sendMessage();
  }

  openCandidate(item: ChatCandidateResponse): void {
    this.open = false;
    this.router.navigate(['/candidates/edit', item.candidate.id]);
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom || !this.messageList) {
      return;
    }

    const element = this.messageList.nativeElement;
    element.scrollTop = element.scrollHeight;
    this.shouldScrollToBottom = false;
  }

  topSkills(item: ChatCandidateResponse): string[] {
    return (item.candidate.skills || []).slice(0, 4);
  }

  private handleResponse(response: ChatResponse): void {
    this.loading = false;
    this.conversationId = response.conversationId;
    this.selectedCandidateId = response.topCandidate?.candidate.id ?? this.selectedCandidateId;

    this.messages = [
      ...this.messages,
      {
        role: 'bot',
        text: response.message,
        explanation: response.explanation,
        candidates: response.candidates
      }
    ];
    this.shouldScrollToBottom = true;
  }
}
