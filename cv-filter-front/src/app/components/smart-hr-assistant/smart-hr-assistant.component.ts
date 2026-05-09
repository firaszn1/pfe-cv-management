import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatCandidateResponse, ChatResponse, ChatService, InterviewKitResponse } from '../../services/chat.service';
import { CandidateService } from '../../services/candidate.service';

type ChatRole = 'user' | 'bot';

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  explanation?: string;
  candidates?: ChatCandidateResponse[];
  intent?: string;
  interviewKit?: InterviewKitResponse;
  suggestedActions?: string[];
  timestamp: Date;
}

@Component({
  selector: 'app-smart-hr-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ── FAB ───────────────────────────────────────────────── -->
    <button class="fab" (click)="togglePanel()" [class.open]="open" title="HR Copilot">
      <span class="fab-ring"></span>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      @if (!open) {
        <span class="fab-label">AI</span>
      }
    </button>

    <!-- ── PANEL ─────────────────────────────────────────────── -->
    @if (open) {
      <section class="panel" [class.expanded]="expanded">

        <!-- Header -->
        <header class="panel-header">
          <div class="header-id">
            <div class="ai-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
            <div>
              <p class="ai-name">HR Copilot</p>
              <span class="ai-status">
                <span class="status-dot"></span>
                {{ selectedCandidateId ? 'Candidate context active' : 'Ready to assist' }}
              </span>
            </div>
          </div>
          <div class="header-controls">
            <button class="ctrl-btn" (click)="clearChat()" title="New chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
            </button>
            <button class="ctrl-btn" (click)="toggleExpanded()" title="{{ expanded ? 'Minimize' : 'Expand' }}">
              @if (expanded) {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                  <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
                </svg>
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              }
            </button>
            <button class="ctrl-btn close-btn" (click)="togglePanel()" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- Context strip -->
        @if (selectedCandidateId) {
          <div class="context-strip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Candidate in context — ask about strengths, interview questions, or comparisons</span>
            <button (click)="selectedCandidateId = null">Clear</button>
          </div>
        }

        <!-- Messages -->
        <div class="messages" #messageList>
          @for (msg of messages; track msg.id) {
            <div class="msg-row" [class.user-row]="msg.role === 'user'">

              @if (msg.role === 'bot') {
                <div class="bot-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                </div>
              }

              <div class="bubble" [class.user-bubble]="msg.role === 'user'" [class.bot-bubble]="msg.role === 'bot'">
                <p class="bubble-text">{{ msg.text }}</p>

                @if (msg.explanation && msg.intent !== 'summary' && msg.intent !== 'interview_kit') {
                  <p class="bubble-explain">{{ msg.explanation }}</p>
                }

                <!-- Search / Job-match / Comparison results -->
                @if (msg.candidates?.length) {
                  <div class="results-meta">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>{{ msg.candidates!.length }} candidate{{ msg.candidates!.length !== 1 ? 's' : '' }}</span>
                    @if (msg.intent === 'comparison') {
                      <span class="intent-tag">Comparison</span>
                    } @else if (msg.intent === 'job_match') {
                      <span class="intent-tag">Job Match</span>
                    } @else if (msg.intent === 'summary') {
                      <span class="intent-tag">Summary</span>
                    }
                  </div>

                  <div class="cand-stack">
                    @for (item of msg.candidates; track item.candidate.id) {
                      <div class="ccard">
                        <!-- Card head -->
                        <div class="ccard-head">
                          <div class="ccard-avatar">{{ initials(item.candidate.fullName) }}</div>
                          <div class="ccard-identity">
                            <strong>{{ item.candidate.fullName || 'Unknown' }}</strong>
                            @if (item.candidate.seniorityLevel) {
                              <span class="seniority-tag" [attr.data-level]="item.candidate.seniorityLevel!.toLowerCase()">
                                {{ item.candidate.seniorityLevel }}
                              </span>
                            }
                          </div>
                          @if (item.candidate.aiMatchScore !== null && item.candidate.aiMatchScore !== undefined) {
                            <div class="score-badge"
                                 [style.color]="scoreColor(item.candidate.aiMatchScore)"
                                 [style.background]="scoreBg(item.candidate.aiMatchScore)">
                              {{ item.candidate.aiMatchScore | number:'1.0-0' }}%
                            </div>
                          }
                        </div>

                        <!-- Job title -->
                        @if (item.candidate.currentJobTitle) {
                          <div class="ccard-role">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                            </svg>
                            {{ item.candidate.currentJobTitle }}
                            @if (item.candidate.yearsOfExperience) {
                              <span class="exp-chip">{{ item.candidate.yearsOfExperience | number:'1.0-1' }} yrs</span>
                            }
                          </div>
                        }

                        <!-- Skills -->
                        @if (topSkills(item).length) {
                          <div class="ccard-skills">
                            @for (skill of topSkills(item); track skill) {
                              <span class="skill-chip">{{ skill }}</span>
                            }
                          </div>
                        }

                        <!-- Match reasons (search/job_match/comparison) -->
                        @if (item.reasons?.length && msg.intent !== 'summary') {
                          <ul class="ccard-reasons">
                            @for (r of item.reasons.slice(0, 3); track r) {
                              <li>{{ r }}</li>
                            }
                          </ul>
                        }

                        <!-- Summary sections -->
                        @if (msg.intent === 'summary') {
                          @if (item.strengths?.length) {
                            <div class="ccard-section">
                              <div class="section-head green">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Strengths
                              </div>
                              @for (s of item.strengths; track s) {
                                <div class="section-item">{{ s }}</div>
                              }
                            </div>
                          }
                          @if (item.weaknesses?.length) {
                            <div class="ccard-section">
                              <div class="section-head amber">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                Gaps
                              </div>
                              @for (w of item.weaknesses; track w) {
                                <div class="section-item">{{ w }}</div>
                              }
                            </div>
                          }
                          @if (msg.explanation) {
                            <p class="summary-explain">{{ msg.explanation }}</p>
                          }
                        }

                        <!-- Hiring recommendation -->
                        @if (item.hiringRecommendation) {
                          <div class="reco-badge"
                               [style.color]="recoColor(item.hiringRecommendation)"
                               [style.background]="recoBg(item.hiringRecommendation)">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            {{ item.hiringRecommendation }}
                          </div>
                        }

                        <!-- Actions -->
                        <div class="ccard-actions">
                          <button class="cact-btn"
                                  [class.shortlisted]="isShortlisted(item.candidate.id)"
                                  (click)="toggleShortlist(item)"
                                  title="Toggle shortlist">
                            <svg width="12" height="12" viewBox="0 0 24 24" [attr.fill]="isShortlisted(item.candidate.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            {{ isShortlisted(item.candidate.id) ? 'Shortlisted' : 'Shortlist' }}
                          </button>
                          <button class="cact-btn" (click)="requestInterviewKit(item)" title="Generate interview kit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10 9 9 9 8 9"/>
                            </svg>
                            Interview Kit
                          </button>
                          <button class="cact-btn primary-act" (click)="openCandidate(item)" title="Open full profile">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            Open
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- Interview kit -->
                @if (msg.interviewKit) {
                  <div class="kit-panel">
                    @if (msg.interviewKit.technical?.length) {
                      <div class="kit-section">
                        <div class="kit-section-head tech">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                          </svg>
                          <span>Technical</span>
                          <em>{{ msg.interviewKit.technical.length }}</em>
                        </div>
                        @for (q of msg.interviewKit.technical; track q) {
                          <div class="kit-q">{{ q }}</div>
                        }
                      </div>
                    }
                    @if (msg.interviewKit.project?.length) {
                      <div class="kit-section">
                        <div class="kit-section-head project">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                          </svg>
                          <span>Project-based</span>
                          <em>{{ msg.interviewKit.project.length }}</em>
                        </div>
                        @for (q of msg.interviewKit.project; track q) {
                          <div class="kit-q">{{ q }}</div>
                        }
                      </div>
                    }
                    @if (msg.interviewKit.hr?.length) {
                      <div class="kit-section">
                        <div class="kit-section-head hr">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                          </svg>
                          <span>HR / Behavioral</span>
                          <em>{{ msg.interviewKit.hr.length }}</em>
                        </div>
                        @for (q of msg.interviewKit.hr; track q) {
                          <div class="kit-q">{{ q }}</div>
                        }
                      </div>
                    }
                    @if (msg.interviewKit.clarification?.length) {
                      <div class="kit-section">
                        <div class="kit-section-head clarify">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          <span>Clarification</span>
                          <em>{{ msg.interviewKit.clarification.length }}</em>
                        </div>
                        @for (q of msg.interviewKit.clarification; track q) {
                          <div class="kit-q">{{ q }}</div>
                        }
                      </div>
                    }
                  </div>
                }

                <time class="bubble-time">{{ msg.timestamp | date:'HH:mm' }}</time>
              </div>
            </div>
          }

          <!-- Typing indicator -->
          @if (loading) {
            <div class="msg-row">
              <div class="bot-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <div class="bubble bot-bubble typing-bubble">
                <div class="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Quick actions -->
        <div class="quick-bar">
          <button class="quick-pill" (click)="usePrompt('Find a senior Java backend developer')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Senior Java
          </button>
          <button class="quick-pill" (click)="usePrompt('Show me junior Angular or React frontend interns')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
            Junior Frontend
          </button>
          <button class="quick-pill" (click)="usePrompt('Compare the top candidates by skills and experience')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Compare
          </button>
          <button class="quick-pill" (click)="usePrompt('Generate interview questions for this candidate')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Interview Kit
          </button>
          <button class="quick-pill" (click)="usePrompt('Find candidates with Docker and Kubernetes DevOps experience')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            DevOps
          </button>
        </div>

        <!-- Composer -->
        <form class="composer" (ngSubmit)="sendMessage()">
          <input
            [(ngModel)]="draft"
            name="copilotMsg"
            placeholder="Search candidates, analyze JD, compare profiles..."
            [disabled]="loading"
            autocomplete="off" />
          <button type="submit" [disabled]="loading || !draft.trim()" class="send-btn">
            @if (loading) {
              <svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            }
          </button>
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
    }

    /* ── FAB ─────────────────────────────────────────────────── */
    .fab {
      width: 58px;
      height: 58px;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 16px 38px rgba(99,102,241,0.36), 0 4px 12px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
      position: relative;
    }

    .fab:hover { transform: translateY(-3px); box-shadow: 0 22px 48px rgba(99,102,241,0.44); }
    .fab.open  { transform: rotate(20deg) scale(0.94); }

    .fab-ring {
      position: absolute;
      inset: -6px;
      border-radius: 24px;
      border: 2px solid rgba(99,102,241,0.28);
      animation: fabPulse 2.4s ease-in-out infinite;
    }

    .fab-label { font-size: 10px; font-weight: 900; line-height: 1; opacity: 0.9; letter-spacing: 0.06em; }

    @keyframes fabPulse {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50%       { opacity: 0.65; transform: scale(1.06); }
    }

    /* ── PANEL ───────────────────────────────────────────────── */
    .panel {
      position: absolute;
      right: 0;
      bottom: 68px;
      width: min(430px, calc(100vw - 28px));
      height: min(680px, calc(100vh - 108px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 22px;
      background: color-mix(in srgb, var(--bg-2) 94%, white 6%);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 32px 80px rgba(0,0,0,0.40), 0 0 0 1px rgba(99,102,241,0.06);
      animation: panelIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
    }

    .panel.expanded {
      width: min(780px, calc(100vw - 28px));
      height: min(820px, calc(100vh - 72px));
    }

    @keyframes panelIn {
      from { opacity: 0; transform: scale(0.92) translateY(14px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    :host-context(.light-theme-root) .panel {
      background: rgba(255,255,255,0.97);
      border-color: rgba(15,23,42,0.08);
    }

    /* ── HEADER ──────────────────────────────────────────────── */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(148,163,184,0.12);
      background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.03));
      flex-shrink: 0;
    }

    .header-id {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .ai-mark {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 6px 18px rgba(99,102,241,0.30);
      flex-shrink: 0;
    }

    .ai-name {
      margin: 0 0 3px;
      font-size: 14px;
      font-weight: 800;
      color: var(--heading);
      letter-spacing: -0.01em;
    }

    .ai-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: var(--muted);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 2px rgba(34,197,94,0.22);
      animation: statusPulse 2s ease-in-out infinite;
    }

    @keyframes statusPulse {
      0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.22); }
      50%       { box-shadow: 0 0 0 4px rgba(34,197,94,0.10); }
    }

    .header-controls { display: flex; align-items: center; gap: 6px; }

    .ctrl-btn {
      width: 30px;
      height: 30px;
      border: 1px solid rgba(148,163,184,0.14);
      border-radius: 9px;
      cursor: pointer;
      color: var(--muted);
      background: rgba(148,163,184,0.08);
      display: grid;
      place-items: center;
      transition: all 0.18s ease;
    }

    .ctrl-btn:hover { color: var(--heading); background: rgba(148,163,184,0.16); }
    .close-btn:hover { color: #f87171; background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.20); }

    /* ── CONTEXT STRIP ───────────────────────────────────────── */
    .context-strip {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      font-size: 11.5px;
      font-weight: 600;
      color: #4ade80;
      background: rgba(34,197,94,0.08);
      border-bottom: 1px solid rgba(34,197,94,0.14);
      flex-shrink: 0;
    }

    .context-strip span { flex: 1; color: var(--muted); }

    .context-strip button {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--heading);
      font-weight: 800;
      font-size: 11.5px;
      padding: 2px 6px;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .context-strip button:hover { background: rgba(148,163,184,0.14); }

    /* ── MESSAGES ────────────────────────────────────────────── */
    .messages {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      scrollbar-width: thin;
    }

    .msg-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      animation: msgIn 0.22s ease both;
    }

    .msg-row.user-row { flex-direction: row-reverse; }

    @keyframes msgIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .bot-avatar {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      display: grid;
      place-items: center;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* ── BUBBLES ─────────────────────────────────────────────── */
    .bubble {
      max-width: 88%;
      padding: 12px 14px;
      border-radius: 16px;
      position: relative;
    }

    .bot-bubble {
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 4px 16px 16px 16px;
    }

    :host-context(.light-theme-root) .bot-bubble {
      background: rgba(15,23,42,0.04);
      border-color: rgba(15,23,42,0.07);
    }

    .user-bubble {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      border: none;
      border-radius: 16px 4px 16px 16px;
      box-shadow: 0 6px 22px rgba(99,102,241,0.26);
    }

    .bubble-text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.55;
      color: var(--text);
    }

    .user-bubble .bubble-text { color: white; }

    .bubble-explain {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--muted);
      line-height: 1.5;
      padding-top: 8px;
      border-top: 1px solid rgba(148,163,184,0.12);
    }

    .bubble-time {
      display: block;
      margin-top: 7px;
      font-size: 10.5px;
      color: var(--muted);
      opacity: 0.6;
      text-align: right;
    }

    .user-bubble .bubble-time { color: rgba(255,255,255,0.65); opacity: 1; }

    /* ── TYPING INDICATOR ────────────────────────────────────── */
    .typing-bubble { padding: 14px 16px; }

    .typing-dots {
      display: flex;
      gap: 5px;
      align-items: center;
    }

    .typing-dots span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent-1);
      opacity: 0.7;
      animation: dotBounce 1.2s ease-in-out infinite;
    }

    .typing-dots span:nth-child(2) { animation-delay: 0.18s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.36s; }

    @keyframes dotBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30%            { transform: translateY(-7px); opacity: 1; }
    }

    /* ── RESULTS META ────────────────────────────────────────── */
    .results-meta {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 10px 0 9px;
      font-size: 11.5px;
      color: var(--muted);
    }

    .intent-tag {
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(99,102,241,0.12);
      color: #a5b4fc;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    :host-context(.light-theme-root) .intent-tag { color: var(--accent-1); }

    /* ── CANDIDATE STACK ─────────────────────────────────────── */
    .cand-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 2px;
    }

    .ccard {
      border: 1px solid rgba(148,163,184,0.14);
      border-radius: 14px;
      padding: 13px;
      background: rgba(15,23,42,0.18);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .ccard:hover {
      border-color: rgba(99,102,241,0.22);
      box-shadow: 0 4px 16px rgba(99,102,241,0.08);
    }

    :host-context(.light-theme-root) .ccard {
      background: rgba(255,255,255,0.75);
      border-color: rgba(15,23,42,0.08);
    }

    /* Card head */
    .ccard-head {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 8px;
    }

    .ccard-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 13px;
      font-weight: 800;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      flex-shrink: 0;
      letter-spacing: 0.04em;
    }

    .ccard-identity {
      flex: 1;
      min-width: 0;
    }

    .ccard-identity strong {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--heading);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .seniority-tag {
      display: inline-block;
      margin-top: 3px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
      background: rgba(148,163,184,0.14);
      color: var(--muted);
      letter-spacing: 0.04em;
    }

    .seniority-tag[data-level="junior"]  { background: rgba(34,197,94,0.12);   color: #4ade80; }
    .seniority-tag[data-level="mid"]     { background: rgba(245,158,11,0.12);  color: #fbbf24; }
    .seniority-tag[data-level="senior"]  { background: rgba(168,85,247,0.12);  color: #c4b5fd; }

    :host-context(.light-theme-root) .seniority-tag[data-level="junior"] { color: #16a34a; }
    :host-context(.light-theme-root) .seniority-tag[data-level="mid"]    { color: #d97706; }
    :host-context(.light-theme-root) .seniority-tag[data-level="senior"] { color: #7c3aed; }

    .score-badge {
      flex-shrink: 0;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.02em;
    }

    /* Role row */
    .ccard-role {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .exp-chip {
      padding: 1px 7px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
      background: rgba(148,163,184,0.12);
      color: var(--muted);
    }

    /* Skills */
    .ccard-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 8px;
    }

    .skill-chip {
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(99,102,241,0.12);
      color: #a5b4fc;
      letter-spacing: 0.02em;
    }

    :host-context(.light-theme-root) .skill-chip { color: var(--accent-1); }

    /* Reasons */
    .ccard-reasons {
      margin: 0 0 8px;
      padding-left: 16px;
      font-size: 11.5px;
      color: var(--muted);
      line-height: 1.5;
    }

    .ccard-reasons li + li { margin-top: 2px; }

    /* Summary sections */
    .ccard-section {
      margin-bottom: 8px;
    }

    .section-head {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .section-head.green { color: #4ade80; }
    .section-head.amber { color: #fbbf24; }
    :host-context(.light-theme-root) .section-head.green { color: #16a34a; }
    :host-context(.light-theme-root) .section-head.amber { color: #d97706; }

    .section-item {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.5;
      padding: 3px 0 3px 14px;
      border-left: 2px solid rgba(148,163,184,0.18);
      margin-bottom: 3px;
    }

    .summary-explain {
      margin: 8px 0 0;
      font-size: 11.5px;
      color: var(--muted);
      line-height: 1.5;
      font-style: italic;
    }

    /* Hiring recommendation */
    .reco-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 800;
      margin: 6px 0 8px;
      letter-spacing: 0.03em;
    }

    /* Card actions */
    .ccard-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .cact-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.16);
      cursor: pointer;
      color: var(--muted);
      background: rgba(148,163,184,0.08);
      font-size: 11.5px;
      font-weight: 700;
      transition: all 0.18s ease;
    }

    .cact-btn:hover {
      color: var(--heading);
      background: rgba(148,163,184,0.18);
      border-color: rgba(148,163,184,0.28);
    }

    .cact-btn.shortlisted {
      color: #fbbf24;
      background: rgba(245,158,11,0.12);
      border-color: rgba(245,158,11,0.22);
    }

    .cact-btn.primary-act {
      color: var(--accent-2);
      background: rgba(6,182,212,0.08);
      border-color: rgba(6,182,212,0.18);
    }

    .cact-btn.primary-act:hover {
      color: white;
      background: var(--accent-2);
      border-color: transparent;
      box-shadow: 0 4px 14px rgba(6,182,212,0.28);
    }

    /* ── INTERVIEW KIT ───────────────────────────────────────── */
    .kit-panel {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .kit-section {
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,0.12);
      overflow: hidden;
    }

    .kit-section-head {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 12px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .kit-section-head span { flex: 1; }

    .kit-section-head em {
      padding: 1px 7px;
      border-radius: 999px;
      font-style: normal;
      font-size: 10.5px;
      font-weight: 900;
      background: rgba(148,163,184,0.14);
      color: var(--muted);
    }

    .kit-section-head.tech    { background: rgba(99,102,241,0.08); color: #a5b4fc; }
    .kit-section-head.project { background: rgba(6,182,212,0.08);  color: #67e8f9; }
    .kit-section-head.hr      { background: rgba(34,197,94,0.08);  color: #86efac; }
    .kit-section-head.clarify { background: rgba(245,158,11,0.08); color: #fcd34d; }

    :host-context(.light-theme-root) .kit-section-head.tech    { color: var(--accent-1); }
    :host-context(.light-theme-root) .kit-section-head.project { color: var(--accent-2); }
    :host-context(.light-theme-root) .kit-section-head.hr      { color: #16a34a; }
    :host-context(.light-theme-root) .kit-section-head.clarify { color: #d97706; }

    .kit-q {
      padding: 8px 12px;
      font-size: 12px;
      color: var(--text);
      line-height: 1.5;
      border-top: 1px solid rgba(148,163,184,0.07);
    }

    .kit-q:hover { background: rgba(148,163,184,0.05); }

    /* ── QUICK BAR ───────────────────────────────────────────── */
    .quick-bar {
      display: flex;
      gap: 7px;
      padding: 10px 14px 0;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }

    .quick-bar::-webkit-scrollbar { display: none; }

    .quick-pill {
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid rgba(148,163,184,0.16);
      border-radius: 999px;
      padding: 7px 11px;
      cursor: pointer;
      color: var(--muted);
      background: rgba(148,163,184,0.08);
      font-weight: 700;
      font-size: 11.5px;
      transition: all 0.18s ease;
    }

    .quick-pill:hover {
      color: var(--heading);
      background: rgba(99,102,241,0.10);
      border-color: rgba(99,102,241,0.22);
    }

    /* ── COMPOSER ────────────────────────────────────────────── */
    .composer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 9px;
      padding: 12px 14px 14px;
      flex-shrink: 0;
    }

    .composer input {
      min-width: 0;
      border: 1px solid rgba(148,163,184,0.18);
      border-radius: 14px;
      padding: 11px 14px;
      font-size: 13.5px;
      color: var(--text);
      background: rgba(255,255,255,0.05);
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .composer input::placeholder { color: var(--muted); opacity: 0.7; }

    .composer input:focus {
      border-color: rgba(99,102,241,0.40);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.10);
    }

    :host-context(.light-theme-root) .composer input {
      background: rgba(255,255,255,0.85);
    }

    .send-btn {
      width: 46px;
      height: 46px;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 6px 18px rgba(99,102,241,0.28);
      display: grid;
      place-items: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 26px rgba(99,102,241,0.36);
    }

    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    .spin-icon { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── RESPONSIVE ──────────────────────────────────────────── */
    @media (max-width: 640px) {
      :host { right: 14px; bottom: 14px; }
      .panel.expanded { width: calc(100vw - 28px); height: calc(100vh - 90px); }
    }
  `]
})
export class SmartHrAssistantComponent implements AfterViewChecked {
  private chatService = inject(ChatService);
  private candidateService = inject(CandidateService);
  private router = inject(Router);

  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  open = false;
  expanded = false;
  loading = false;
  private shouldScrollToBottom = true;

  draft = '';
  conversationId: string | null = null;
  selectedCandidateId: string | null = null;
  shortlistedIds = new Set<string>();

  messages: ChatMessage[] = [
    {
      id: '0',
      role: 'bot',
      text: 'Hi! I am your HR Recruitment Copilot. I can search candidates, compare profiles, summarize CVs, match job descriptions, and generate interview kits — all connected to live ATS data.',
      timestamp: new Date()
    }
  ];

  // ── Panel control ───────────────────────────────────────────────────────

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
    this.shortlistedIds.clear();
    this.messages = [{
      id: '0',
      role: 'bot',
      text: 'New session started. What profile are you looking for?',
      timestamp: new Date()
    }];
    this.shouldScrollToBottom = true;
  }

  usePrompt(prompt: string): void {
    this.draft = prompt;
    this.sendMessage();
  }

  // ── Messaging ───────────────────────────────────────────────────────────

  sendMessage(): void {
    const message = this.draft.trim();
    if (!message || this.loading) return;

    this.messages = [...this.messages, {
      id: Date.now().toString(),
      role: 'user',
      text: message,
      timestamp: new Date()
    }];
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
        this.messages = [...this.messages, {
          id: Date.now().toString(),
          role: 'bot',
          text: 'The assistant service is temporarily unavailable. Please verify the backend is running and try again.',
          timestamp: new Date()
        }];
        this.shouldScrollToBottom = true;
      }
    });
  }

  private handleResponse(response: ChatResponse): void {
    this.loading = false;
    this.conversationId = response.conversationId;
    this.selectedCandidateId = response.topCandidate?.candidate.id ?? this.selectedCandidateId;

    (response.candidates || []).forEach(item => {
      if (item.candidate.shortlisted) this.shortlistedIds.add(item.candidate.id);
    });

    this.messages = [...this.messages, {
      id: Date.now().toString(),
      role: 'bot',
      text: response.message,
      explanation: response.explanation,
      candidates: response.candidates,
      intent: response.intent,
      interviewKit: response.interviewKit,
      suggestedActions: response.suggestedActions,
      timestamp: new Date()
    }];
    this.shouldScrollToBottom = true;
  }

  // ── Candidate actions ───────────────────────────────────────────────────

  selectCandidate(item: ChatCandidateResponse): void {
    this.selectedCandidateId = item.candidate.id;
    this.draft = `Summarize ${item.candidate.fullName}`;
    this.sendMessage();
  }

  requestInterviewKit(item: ChatCandidateResponse): void {
    this.selectedCandidateId = item.candidate.id;
    this.draft = `Generate interview questions for ${item.candidate.fullName}`;
    this.sendMessage();
  }

  toggleShortlist(item: ChatCandidateResponse): void {
    const id = item.candidate.id;
    this.candidateService.toggleShortlist(id).subscribe({
      next: () => {
        if (this.shortlistedIds.has(id)) {
          this.shortlistedIds.delete(id);
        } else {
          this.shortlistedIds.add(id);
        }
      },
      error: () => {}
    });
  }

  isShortlisted(id: string): boolean {
    return this.shortlistedIds.has(id);
  }

  openCandidate(item: ChatCandidateResponse): void {
    this.open = false;
    this.router.navigate(['/candidates/edit', item.candidate.id]);
  }

  // ── Display helpers ─────────────────────────────────────────────────────

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  topSkills(item: ChatCandidateResponse): string[] {
    return (item.candidate.skills || []).slice(0, 5);
  }

  scoreColor(score: number | null | undefined): string {
    if (score == null) return '#8a9ab5';
    if (score >= 80) return '#4ade80';
    if (score >= 65) return '#fbbf24';
    if (score >= 45) return '#fb923c';
    return '#f87171';
  }

  scoreBg(score: number | null | undefined): string {
    if (score == null) return 'rgba(138,154,181,0.12)';
    if (score >= 80) return 'rgba(34,197,94,0.13)';
    if (score >= 65) return 'rgba(245,158,11,0.13)';
    if (score >= 45) return 'rgba(249,115,22,0.13)';
    return 'rgba(239,68,68,0.13)';
  }

  recoColor(reco: string | undefined): string {
    if (!reco) return '#8a9ab5';
    const r = reco.toLowerCase();
    if (r.includes('strong')) return '#4ade80';
    if (r.includes('recommend')) return '#a5b4fc';
    if (r.includes('consider')) return '#fbbf24';
    return '#f87171';
  }

  recoBg(reco: string | undefined): string {
    if (!reco) return 'rgba(138,154,181,0.12)';
    const r = reco.toLowerCase();
    if (r.includes('strong')) return 'rgba(34,197,94,0.12)';
    if (r.includes('recommend')) return 'rgba(99,102,241,0.12)';
    if (r.includes('consider')) return 'rgba(245,158,11,0.12)';
    return 'rgba(239,68,68,0.12)';
  }

  // ── Scroll ──────────────────────────────────────────────────────────────

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom || !this.messageList) return;
    const el = this.messageList.nativeElement;
    el.scrollTop = el.scrollHeight;
    this.shouldScrollToBottom = false;
  }
}
