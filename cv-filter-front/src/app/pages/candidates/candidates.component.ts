import { Component, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import keycloak from '../../keycloak';
import {
  CandidateService,
  CandidateResponse,
  CandidateFilterRequest,
  CandidateStatus,
  InterviewKitResponse,
  JobMatchResponse,
  CandidateCompareResponse,
  ScoreBreakdownResponse
} from '../../services/candidate.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="candidates-page">
      <div class="ai-match-card">
        <div class="search-head">
          <div>
            <p class="eyebrow">AI Candidate Match</p>
            <h2>Find, rank, and explain the best profiles</h2>
          </div>
        </div>

        <div class="mode-tabs">
          <button [class.active]="aiMode === 'search'" (click)="setAiMode('search')">Quick search</button>
          <button [class.active]="aiMode === 'job'" (click)="setAiMode('job')">Job description</button>
        </div>

        <textarea
          [(ngModel)]="aiMatchText"
          [placeholder]="aiMode === 'search'
            ? 'Try: senior Java backend developer with Spring Boot and Docker'
            : 'Paste required skills, seniority, responsibilities, technologies, and nice-to-have criteria...'"></textarea>

        <div class="action-row">
          <button class="primary-btn" (click)="runAiMatch()" [disabled]="jobMatchLoading || !aiMatchText.trim()">
            {{ jobMatchLoading ? 'Analyzing...' : aiMode === 'search' ? 'AI Search' : 'Analyze & Rank' }}
          </button>
          <button class="secondary-btn" (click)="useAiExample('Senior Java backend developer with Spring Boot, REST APIs, Docker, and at least 2 years experience')">Backend example</button>
          <button class="secondary-btn" (click)="useAiExample('Junior Angular intern with TypeScript, HTML, CSS, and good communication skills')">Intern example</button>
          <button class="secondary-btn" (click)="clearAiMatch()">Clear</button>
        </div>

        @if (jobMatch && aiMode === 'job') {
          <div class="extracted-row">
            <span>Seniority: {{ jobMatch.seniority || 'Not detected' }}</span>
            @for (skill of jobMatch.extractedSkills; track skill) {
              <em>{{ skill }}</em>
            }
          </div>
        }
      </div>
      <div class="filters-card">
        <div class="section-head">
          <div class="section-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </div>
          <div>
            <p class="eyebrow">Filter</p>
            <h3>Search & Filter Candidates</h3>
          </div>
        </div>

        <div class="filters-grid">
          <div class="field">
            <label>Name</label>
            <input [(ngModel)]="filter.fullName" placeholder="Candidate name" />
          </div>

          <div class="field">
            <label>Skill</label>
            <input [(ngModel)]="filter.skill" placeholder="java / angular / spring boot" />
          </div>

          <div class="field">
            <label>Seniority</label>
            <select [(ngModel)]="filter.seniorityLevel">
              <option value="">Any</option>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
            </select>
          </div>

          <div class="field">
            <label>Minimum Experience</label>
            <div class="experience-inputs">
              <input type="number" min="0" step="1" [(ngModel)]="minExperienceYears" placeholder="Years" />
              <input type="number" min="0" max="11" step="1" [(ngModel)]="minExperienceMonths" placeholder="Months" />
            </div>
          </div>

          <div class="field field-wide">
            <label>Job Title</label>
            <input [(ngModel)]="filter.currentJobTitle" placeholder="developer / engineer / intern" />
          </div>

          <div class="field field-wide">
            <label>Status</label>
            <select [(ngModel)]="filter.status">
              <option value="">Any</option>
              @for (status of statuses; track status) {
                <option [value]="status">{{ statusLabel(status) }}</option>
              }
            </select>
          </div>
        </div>

        <div class="action-row">
          <button class="primary-btn" (click)="applyCombinedFilter()">⚡ Apply Filter</button>
          <button class="secondary-btn" (click)="resetFilters()">↺ Reset</button>
          <button class="secondary-btn" (click)="loadCandidates(0)">◎ Load All</button>
          <button class="secondary-btn" (click)="loadShortlisted()">Shortlisted</button>
        </div>
      </div>

      @if (!candidatesLoading && candidates.length === 0) {
        <div class="empty-card">
          <div class="empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>No candidates found</h3>
          <p>Try adjusting your search or filters, or upload a new CV to get started.</p>
          <a routerLink="/upload" class="empty-action">Upload a CV</a>
        </div>
      }

      @if (candidatesLoading) {
        <div class="cards-grid">
          @for (item of skeletonCards; track item) {
            <div class="candidate-card skeleton-card">
              <span></span>
              <strong></strong>
              <p></p>
              <em></em>
            </div>
          }
        </div>
      }

      @if (selectedCandidateIds.length > 0) {
        <div class="compare-bar">
          <span>{{ selectedCandidateIds.length }} selected for comparison</span>
          <button class="primary-btn small" (click)="compareSelectedCandidates()" [disabled]="selectedCandidateIds.length < 2">
            Compare selected
          </button>
          <button class="secondary-btn small" (click)="exportShortlist()">Export shortlist</button>
          <button class="secondary-btn small" (click)="clearSelection()">Clear</button>
        </div>
      }

      @if (!candidatesLoading) {
      <div class="cards-grid">
        @for (candidate of candidates; track candidate.id) {
          <div class="candidate-card">
            <div class="candidate-header">
              <div class="candidate-avatar">{{ initials(candidate.fullName) }}</div>
              <div class="candidate-name-block">
                <h3>{{ candidate.fullName }}</h3>
                <p class="job-title">{{ candidate.currentJobTitle || 'No job title' }}</p>
              </div>
              <div class="candidate-header-right">
                @if (candidate.aiMatchScore !== null) {
                  <div class="score-badge">
                    <span class="score-pct">{{ candidate.aiMatchScore }}%</span>
                    <span class="score-lbl">match</span>
                  </div>
                }
                <button
                  class="star-toggle"
                  [class.active]="candidate.shortlisted"
                  (click)="toggleShortlist(candidate)"
                  [title]="candidate.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'">
                  @if (candidate.shortlisted) {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  } @else {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  }
                </button>
              </div>
            </div>

            <label class="select-line">
              <input
                type="checkbox"
                [checked]="isSelected(candidate.id)"
                (change)="toggleCandidateSelection(candidate.id)" />
              <span>Compare</span>
            </label>

            <div class="lifecycle-row">
              <div class="status-segmented" role="group" aria-label="Candidate status">
                @for (status of statuses; track status) {
                  <button
                    type="button"
                    [class.active]="candidate.status === status"
                    [attr.data-status]="status"
                    (click)="changeStatus(candidate, status)">
                    {{ statusLabel(status) }}
                  </button>
                }
              </div>
            </div>

            @if (candidate.scoreBreakdown) {
              <div class="score-breakdown">
                @for (item of breakdownItems(candidate.scoreBreakdown); track item.label) {
                  <div class="score-row">
                    <span>{{ item.label }}</span>
                    <div class="score-track">
                      <i [style.width.%]="item.value" [style.background]="scoreColor(item.value)"></i>
                    </div>
                    <strong>{{ item.value }}%</strong>
                  </div>
                }
              </div>
            }

            @if (candidate.parsingWarnings.length) {
              <div class="tags">
                @for (warning of candidate.parsingWarnings; track warning) {
                  <span class="tag alt">{{ warning }}</span>
                }
              </div>
            }

            <div class="info-grid">
              <div class="info-item">
                <span>Email</span>
                <strong>{{ candidate.email || '—' }}</strong>
              </div>

              <div class="info-item">
                <span>Phone</span>
                <strong>{{ candidate.phone || '—' }}</strong>
              </div>

              <div class="info-item">
                <span>Seniority</span>
                <strong>{{ candidate.seniorityLevel || '—' }}</strong>
              </div>

              <div class="info-item">
                <span>Experience</span>
                <strong>{{ formatExperience(candidate.yearsOfExperience) }}</strong>
              </div>

              <div class="info-item field-wide">
                <span>Location</span>
                <strong>{{ candidate.address || '—' }}</strong>
              </div>

              <div class="info-item field-wide">
                <span>Degree</span>
                <strong>{{ candidate.highestDegree || '—' }}</strong>
              </div>

              @if (candidate.linkedinUrl || candidate.githubUrl || candidate.portfolioUrl) {
                <div class="info-item field-wide">
                  <span>Links</span>
                  <div class="profile-links">
                    @if (candidate.linkedinUrl) {
                      <a [href]="candidate.linkedinUrl" target="_blank" rel="noopener">LinkedIn</a>
                    }
                    @if (candidate.githubUrl) {
                      <a [href]="candidate.githubUrl" target="_blank" rel="noopener">GitHub</a>
                    }
                    @if (candidate.portfolioUrl) {
                      <a [href]="candidate.portfolioUrl" target="_blank" rel="noopener">Portfolio</a>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="tags-section">
              <p>Skills</p>
              <div class="tags">
                @for (skill of candidate.skills; track skill) {
                  <span class="tag skill-tag"><i></i>{{ skill }}</span>
                }
              </div>
            </div>

            @if (candidate.languages.length > 0) {
              <div class="tags-section">
                <p>Languages</p>
                <div class="tags">
                  @for (language of candidate.languages; track language) {
                    <span class="tag alt">{{ language }}</span>
                  }
                </div>
              </div>
            }

            @if (candidate.experienceEntries.length || hasNonExperienceDetails(candidate)) {
              <div class="details-section">
                <div class="experience-toggle-row">
                  <p>Experience details</p>
                  <button class="details-toggle" (click)="toggleExperienceDetails(candidate.id)">
                    {{ isExperienceExpanded(candidate.id) ? 'Hide Experience' : 'Show Experience' }}
                    <span [class.open]="isExperienceExpanded(candidate.id)">⌄</span>
                  </button>
                </div>

                <div class="experience-collapse" [class.open]="isExperienceExpanded(candidate.id)">
                  @if (candidate.experienceEntries.length) {
                    <div>
                      <p>Experience</p>
                      <ul>
                        @for (item of candidate.experienceEntries; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }
                  @if (candidate.projectEntries.length) {
                    <div>
                      <p>Projects</p>
                      <ul>
                        @for (item of candidate.projectEntries; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }
                  @if (candidate.educationEntries.length) {
                    <div>
                      <p>Education details</p>
                      <ul>
                        @for (item of candidate.educationEntries; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }
                  @if (candidate.certifications.length) {
                    <div>
                      <p>Certifications</p>
                      <ul>
                        @for (item of candidate.certifications; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="card-footer">
              <span class="file-name">{{ candidate.cvFileName }}</span>

              <div class="card-actions">
                <button class="icon-btn" (click)="viewOriginalCv(candidate)" [disabled]="!candidate.alfrescoNodeId">
                  <span>View</span>
                  View CV
                </button>
                <button class="icon-btn" (click)="downloadOriginalCv(candidate)" [disabled]="!candidate.alfrescoNodeId">
                  <span>Down</span>
                  Download CV
                </button>
                <button class="secondary-btn small" (click)="exportCandidate(candidate)">
                  Export
                </button>
                <button class="primary-btn small" (click)="generateInterviewKit(candidate)">
                  {{ generatingKitForId === candidate.id ? 'Generating...' : 'Interview Kit' }}
                </button>
                <button class="icon-btn edit-btn" [routerLink]="['/candidates/edit', candidate.id]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </button>

                @if (roles.includes('ADMIN')) {
                  <button class="danger-btn small" (click)="deleteCandidate(candidate.id)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Delete
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
      }

      @if (showPagination) {
        <nav class="action-row pagination-bar" aria-label="Candidate pagination">
          <button class="secondary-btn small" (click)="previousPage()" [disabled]="currentPage === 0">Previous</button>
          <div class="page-numbers">
            @for (page of visiblePages(); track page) {
              <button
                type="button"
                [ngClass]="page === currentPage ? 'primary-btn small' : 'secondary-btn small'"
                [disabled]="page === currentPage"
                (click)="loadCandidates(page)">
                {{ page + 1 }}
              </button>
            }
          </div>
          <button class="secondary-btn small" (click)="nextPage()" [disabled]="currentPage >= totalPages - 1">Next</button>
          <span>{{ totalElements }} candidates</span>
        </nav>
      }

      @if (!candidatesLoading && recentCandidates.length > 0) {
        <section class="recent-section">
          <div class="recent-head">
            <div>
              <p class="eyebrow">Talent Movement</p>
              <h3>Recent Candidates</h3>
            </div>
            <div class="carousel-actions">
              <button type="button" (click)="scrollRecent(recentRail, -1)" aria-label="Scroll recent candidates left">‹</button>
              <button type="button" (click)="scrollRecent(recentRail, 1)" aria-label="Scroll recent candidates right">›</button>
            </div>
          </div>

          <div class="recent-carousel" #recentRail>
            @for (candidate of recentCandidates; track candidate.id) {
              <a class="recent-card" [routerLink]="['/candidates/edit', candidate.id]">
                <div class="avatar">{{ initials(candidate.fullName) }}</div>
                <div>
                  <h4>{{ candidate.fullName || 'Unnamed candidate' }}</h4>
                  <p>{{ candidate.currentJobTitle || 'No job title' }}</p>
                  <span class="tag">{{ statusLabel(candidate.status) }}</span>
                  <time>{{ relativeDate(candidate.createdAt) }}</time>
                </div>
              </a>
            }
          </div>
        </section>
      }

      @if (interviewKit) {
        <div class="kit-backdrop" (click)="closeInterviewKit()">
          <section class="kit-panel" (click)="$event.stopPropagation()">
            <div class="kit-head">
              <div>
                <p class="eyebrow">AI Interview Kit</p>
                <h3>{{ interviewKit.candidateName }}</h3>
                <span>{{ interviewKit.seniorityLevel }} | {{ interviewKit.jobTitle }}</span>
              </div>
              <button class="secondary-btn small" (click)="closeInterviewKit()">Close</button>
            </div>

            <div class="kit-grid">
              <section class="kit-section">
                <h4>Technical Questions</h4>
                <ol>
                  @for (question of interviewKit.technical; track question) {
                    <li>{{ question }}</li>
                  }
                </ol>
              </section>

              <section class="kit-section">
                <h4>Project-Based Questions</h4>
                <ol>
                  @for (question of interviewKit.project; track question) {
                    <li>{{ question }}</li>
                  }
                </ol>
              </section>

              <section class="kit-section">
                <h4>HR / Behavioral Questions</h4>
                <ol>
                  @for (question of interviewKit.hr; track question) {
                    <li>{{ question }}</li>
                  }
                </ol>
              </section>

              <section class="kit-section">
                <h4>Clarification / Weakness Questions</h4>
                <ol>
                  @for (question of interviewKit.clarification; track question) {
                    <li>{{ question }}</li>
                  }
                </ol>
              </section>
            </div>
          </section>
        </div>
      }

      @if (comparisonResult) {
        <div class="kit-backdrop" (click)="closeComparison()">
          <section class="kit-panel" (click)="$event.stopPropagation()">
            <div class="kit-head">
              <div>
                <p class="eyebrow">Candidate Comparison</p>
                <h3>Side-by-side decision support</h3>
                <span>{{ comparisonResult.candidates.length }} candidates compared</span>
              </div>
              <button class="secondary-btn small" (click)="closeComparison()">Close</button>
            </div>

            <div class="comparison-grid">
              @for (candidate of comparisonResult.candidates; track candidate.id) {
                <article class="comparison-card">
                  <h4>{{ candidate.fullName }}</h4>
                  <p>{{ candidate.currentJobTitle || 'No job title' }}</p>
                  <strong>{{ candidate.seniorityLevel || 'Unknown' }} | {{ formatExperience(candidate.yearsOfExperience) }}</strong>
                  <div class="tags compact-tags">
                    @for (skill of candidate.skills.slice(0, 6); track skill) {
                      <span class="tag">{{ skill }}</span>
                    }
                  </div>
                </article>
              }
            </div>

            <div class="kit-grid">
              <section class="kit-section">
                <h4>Skills Overlap</h4>
                <p>{{ comparisonResult.comparison.skillsOverlap.join(', ') || 'No shared skills detected.' }}</p>
              </section>
              <section class="kit-section">
                <h4>Experience Difference</h4>
                <p>{{ comparisonResult.comparison.experienceDifference }}</p>
              </section>
              <section class="kit-section">
                <h4>Strengths</h4>
                <ol>
                  @for (item of comparisonResult.comparison.strengths; track item) {
                    <li>{{ item }}</li>
                  }
                </ol>
              </section>
              <section class="kit-section">
                <h4>Weaknesses / Risks</h4>
                <ol>
                  @for (item of comparisonResult.comparison.weaknesses; track item) {
                    <li>{{ item }}</li>
                  }
                </ol>
              </section>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --surface:   rgba(255,255,255,0.046);
      --surface-2: rgba(255,255,255,0.032);
      --surface-3: rgba(255,255,255,0.072);
      --border:    rgba(255,255,255,0.08);
      --text:      #e2eaf6;
      --heading:   #f0f6ff;
      --muted:     #8a9ab5;
      --accent-1:  #6366f1;
      --accent-2:  #06b6d4;
      --danger-1:  #ef4444;
      --danger-2:  #f97316;
      --shadow:    0 16px 40px rgba(0,0,0,0.22);
    }

    :host-context(.light-theme-root) {
      --surface:   rgba(255,255,255,0.88);
      --surface-2: rgba(255,255,255,0.76);
      --surface-3: rgba(15,23,42,0.05);
      --border:    rgba(15,23,42,0.08);
      --text:      #1e293b;
      --heading:   #0f172a;
      --muted:     #64748b;
      --accent-1:  #4f46e5;
      --accent-2:  #0891b2;
      --danger-1:  #dc2626;
      --danger-2:  #ea580c;
      --shadow:    0 18px 40px rgba(15,23,42,0.08);
    }

    /* ── PAGE ───────────────────────────────────────────── */
    .candidates-page {
      display: flex;
      flex-direction: column;
      gap: 22px;
      color: var(--text);
    }

    /* ── BASE CARDS ─────────────────────────────────────── */
    .ai-match-card,
    .filters-card,
    .empty-card,
    .candidate-card,
    .recent-section {
      padding: 26px;
      border-radius: 22px;
      background: linear-gradient(145deg, var(--surface), var(--surface-2));
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    /* ── SECTION HEAD ───────────────────────────────────── */
    .section-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 20px;
    }

    .section-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      color: white;
      flex-shrink: 0;
      box-shadow: 0 6px 16px rgba(99,102,241,0.28);
    }

    .section-head h3 {
      margin: 2px 0 0;
      font-size: 19px;
      font-weight: 800;
      color: var(--heading);
      letter-spacing: -0.01em;
    }

    /* ── EYEBROW ────────────────────────────────────────── */
    .eyebrow {
      margin: 0 0 4px;
      color: var(--accent-2);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    :host-context(.light-theme-root) .eyebrow { color: var(--accent-1); }

    /* ── AI MATCH CARD ──────────────────────────────────── */
    .ai-match-card {
      background:
        linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(6,182,212,0.06) 100%),
        var(--surface);
      border-color: rgba(99,102,241,0.16);
    }

    .search-head {
      margin-bottom: 16px;
    }

    .search-head h2 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: var(--heading);
      letter-spacing: -0.02em;
    }

    .ai-match-card textarea {
      width: 100%;
      min-height: 118px;
      resize: vertical;
      box-sizing: border-box;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      outline: none;
      line-height: 1.6;
      font-size: 14px;
      transition: border-color 0.22s ease, box-shadow 0.22s ease;
    }

    /* ── MODE TABS ──────────────────────────────────────── */
    .mode-tabs {
      display: inline-flex;
      gap: 5px;
      padding: 5px;
      margin-bottom: 14px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .mode-tabs button {
      border: none;
      border-radius: 12px;
      padding: 9px 16px;
      cursor: pointer;
      color: var(--muted);
      background: transparent;
      font-weight: 700;
      font-size: 13.5px;
      transition: all 0.2s ease;
    }

    .mode-tabs button.active {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 8px 18px rgba(99,102,241,0.22);
    }

    /* ── EXTRACTED ROW ──────────────────────────────────── */
    .extracted-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
      color: var(--muted);
      font-weight: 700;
      font-size: 13px;
    }

    .extracted-row em {
      padding: 5px 11px;
      border-radius: 999px;
      color: #c7d2fe;
      background: rgba(99,102,241,0.16);
      border: 1px solid rgba(99,102,241,0.2);
      font-style: normal;
      font-size: 12.5px;
      font-weight: 600;
    }

    :host-context(.light-theme-root) .extracted-row em { color: var(--accent-1); }

    /* ── FILTERS CARD ───────────────────────────────────── */
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .field label {
      color: var(--muted);
      font-size: 12.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .field input,
    .field select {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      outline: none;
      font-size: 14px;
      transition: border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .field-wide { grid-column: span 2; }

    .experience-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    /* ── ACTION ROW ─────────────────────────────────────── */
    .action-row {
      display: flex;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
      align-items: center;
    }

    /* ── BUTTONS ────────────────────────────────────────── */
    .primary-btn,
    .secondary-btn,
    .danger-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: none;
      cursor: pointer;
      border-radius: 12px;
      padding: 12px 18px;
      font-weight: 700;
      font-size: 13.5px;
      transition: all 0.2s ease;
    }

    .primary-btn {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 8px 22px rgba(99,102,241,0.24);
    }

    .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(99,102,241,0.32); }

    .secondary-btn {
      color: var(--text);
      background: var(--surface-3);
      border: 1px solid var(--border);
    }

    .secondary-btn:hover { transform: translateY(-1px); border-color: rgba(99,102,241,0.22); }

    .danger-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: white;
      background: linear-gradient(135deg, var(--danger-1), var(--danger-2));
      box-shadow: 0 6px 18px rgba(239,68,68,0.22);
    }

    .danger-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(239,68,68,0.30); }

    .primary-btn:active,
    .secondary-btn:active,
    .danger-btn:active { transform: scale(0.97); }

    .small { padding: 9px 14px; font-size: 12.5px; }

    /* ── CARDS GRID ─────────────────────────────────────── */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    /* ── CANDIDATE CARD ─────────────────────────────────── */
    .candidate-card {
      overflow: hidden;
      transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
    }

    .candidate-card:hover {
      transform: translateY(-3px);
      border-color: rgba(99,102,241,0.22);
      box-shadow: 0 24px 56px rgba(0,0,0,0.26), 0 0 0 1px rgba(99,102,241,0.12);
    }

    /* ── CANDIDATE HEADER ───────────────────────────────── */
    .candidate-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 18px;
    }

    .candidate-avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      color: white;
      font-weight: 800;
      font-size: 17px;
      flex-shrink: 0;
      box-shadow: 0 6px 16px rgba(99,102,241,0.28);
    }

    .candidate-name-block {
      flex: 1;
      min-width: 0;
      padding-top: 3px;
    }

    .candidate-name-block h3 {
      margin: 0 0 5px;
      font-size: 18px;
      font-weight: 800;
      color: var(--heading);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .job-title {
      margin: 0;
      color: var(--muted);
      font-size: 13.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .candidate-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }

    /* ── SCORE BADGE ────────────────────────────────────── */
    .score-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 13px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(34,197,94,0.14), rgba(6,182,212,0.10));
      border: 1px solid rgba(34,197,94,0.22);
      min-width: 58px;
    }

    .score-pct {
      font-weight: 800;
      font-size: 17px;
      color: #4ade80;
      line-height: 1;
    }

    .score-lbl {
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-top: 2px;
    }

    /* ── STAR TOGGLE ────────────────────────────────────── */
    .star-toggle {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--muted);
      background: var(--surface-3);
      cursor: pointer;
      transition: all 0.22s ease;
      flex-shrink: 0;
    }

    .star-toggle:hover {
      transform: scale(1.06);
      border-color: rgba(245,158,11,0.30);
      background: rgba(245,158,11,0.10);
      color: #fbbf24;
    }

    .star-toggle.active {
      color: #fbbf24;
      background: rgba(245,158,11,0.14);
      border-color: rgba(245,158,11,0.34);
      box-shadow: 0 0 0 3px rgba(245,158,11,0.08), 0 8px 20px rgba(245,158,11,0.14);
    }

    .star-toggle:active { transform: scale(0.92); }

    /* ── SELECT LINE ────────────────────────────────────── */
    .select-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      color: var(--muted);
      font-weight: 700;
      font-size: 12.5px;
      cursor: pointer;
    }

    /* ── STATUS SEGMENTED ───────────────────────────────── */
    .lifecycle-row { margin-bottom: 18px; }

    .status-segmented {
      display: flex;
      gap: 5px;
      padding: 5px;
      overflow-x: auto;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      scrollbar-width: thin;
    }

    .status-segmented button {
      flex: 0 0 auto;
      min-width: 88px;
      border: 0;
      border-radius: 13px;
      padding: 9px 11px;
      cursor: pointer;
      color: var(--muted);
      background: transparent;
      font-size: 12px;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .status-segmented button:hover {
      color: var(--heading);
      background: var(--surface-3);
    }

    .status-segmented button.active { color: #fff; font-weight: 800; }

    .status-segmented button[data-status="NEEDS_REVIEW"].active {
      background: linear-gradient(135deg, #b45309, #f59e0b);
      box-shadow: 0 6px 16px rgba(245,158,11,0.24);
    }

    .status-segmented button[data-status="NEW"].active {
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      box-shadow: 0 6px 16px rgba(59,130,246,0.24);
    }

    .status-segmented button[data-status="REVIEWED"].active {
      background: linear-gradient(135deg, #6d28d9, #8b5cf6);
      box-shadow: 0 6px 16px rgba(139,92,246,0.24);
    }

    .status-segmented button[data-status="INTERVIEW"].active {
      background: linear-gradient(135deg, #0e7490, #06b6d4);
      box-shadow: 0 6px 16px rgba(6,182,212,0.24);
    }

    .status-segmented button[data-status="REJECTED"].active {
      background: linear-gradient(135deg, #b91c1c, #ef4444);
      box-shadow: 0 6px 16px rgba(239,68,68,0.24);
    }

    .status-segmented button[data-status="HIRED"].active {
      background: linear-gradient(135deg, #15803d, #22c55e);
      box-shadow: 0 6px 16px rgba(34,197,94,0.24);
    }

    /* ── SCORE BREAKDOWN ────────────────────────────────── */
    .score-breakdown {
      display: grid;
      gap: 9px;
      margin-bottom: 18px;
      padding: 16px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .score-row {
      display: grid;
      grid-template-columns: 90px 1fr 44px;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
    }

    .score-track {
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(148,163,184,0.14);
    }

    .score-track i {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1);
    }

    .score-row strong {
      color: var(--heading);
      text-align: right;
      font-size: 12.5px;
    }

    /* ── INFO GRID ──────────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }

    .info-item {
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: border-color 0.2s ease;
    }

    .info-item:hover { border-color: rgba(99,102,241,0.18); }

    .info-item span {
      display: block;
      margin-bottom: 5px;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-weight: 700;
    }

    .info-item strong {
      color: var(--heading);
      font-size: 13.5px;
      line-height: 1.4;
    }

    .profile-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .profile-links a {
      color: #93c5fd;
      font-weight: 700;
      text-decoration: none;
      font-size: 13px;
      transition: color 0.2s ease;
    }

    .profile-links a:hover { color: white; }

    /* ── TAGS ───────────────────────────────────────────── */
    .tags-section { margin-bottom: 16px; }

    .tags-section p {
      margin: 0 0 9px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 11px;
      border-radius: 999px;
      background: rgba(99,102,241,0.14);
      border: 1px solid rgba(99,102,241,0.20);
      color: #c7d2fe;
      font-size: 12.5px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .tag:hover {
      transform: translateY(-1px);
      border-color: rgba(6,182,212,0.26);
      background: rgba(99,102,241,0.20);
    }

    .skill-tag i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 8px rgba(34,211,238,0.5);
      flex-shrink: 0;
    }

    :host-context(.light-theme-root) .tag { color: var(--accent-1); }

    .tag.alt {
      background: rgba(6,182,212,0.12);
      border-color: rgba(6,182,212,0.18);
      color: #a5f3fc;
    }

    :host-context(.light-theme-root) .tag.alt { color: #0f766e; }

    /* ── PARSING WARNINGS ───────────────────────────────── */
    .tags .tag.alt {
      background: rgba(245,158,11,0.10);
      border-color: rgba(245,158,11,0.18);
      color: #fbbf24;
    }

    /* ── DETAILS SECTION ────────────────────────────────── */
    .details-section {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .details-section p {
      margin: 0 0 8px;
      color: var(--muted);
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .experience-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .experience-toggle-row p { margin: 0; }

    .details-toggle {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 7px 13px;
      color: var(--text);
      background: var(--surface-3);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      transition: all 0.22s ease;
    }

    .details-toggle:hover {
      transform: translateY(-1px);
      border-color: rgba(99,102,241,0.24);
      box-shadow: 0 8px 18px rgba(99,102,241,0.10);
    }

    .details-toggle span {
      display: inline-block;
      transition: transform 0.22s ease;
    }

    .details-toggle span.open { transform: rotate(180deg); }

    .experience-collapse {
      display: grid;
      gap: 12px;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-6px);
      transition: max-height 0.3s ease, opacity 0.25s ease, transform 0.25s ease;
    }

    .experience-collapse.open {
      max-height: 900px;
      opacity: 1;
      transform: translateY(0);
    }

    .details-section ul {
      margin: 0;
      padding-left: 18px;
      color: var(--text);
      line-height: 1.6;
    }

    /* ── CARD FOOTER ────────────────────────────────────── */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 14px;
      margin-top: 6px;
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .file-name {
      color: var(--muted);
      font-size: 12px;
      word-break: break-all;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-actions {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      align-items: center;
    }

    /* ── ICON BUTTONS ───────────────────────────────────── */
    .icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 12px;
      cursor: pointer;
      color: var(--muted);
      background: var(--surface-3);
      font-size: 12.5px;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .icon-btn:hover {
      transform: translateY(-1px);
      color: var(--heading);
      border-color: rgba(99,102,241,0.24);
      box-shadow: 0 8px 20px rgba(99,102,241,0.10);
    }

    .icon-btn:active { transform: scale(0.97); }

    .icon-btn:disabled {
      cursor: not-allowed;
      opacity: 0.44;
      transform: none;
    }

    .edit-btn {
      color: #a5b4fc;
      border-color: rgba(99,102,241,0.18);
      background: rgba(99,102,241,0.08);
    }

    .edit-btn:hover {
      color: white;
      border-color: rgba(99,102,241,0.35);
      background: rgba(99,102,241,0.16);
    }

    /* ── EMPTY STATE ────────────────────────────────────── */
    .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 48px 28px;
    }

    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.12);
      color: var(--muted);
      margin-bottom: 6px;
    }

    .empty-card h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--heading);
    }

    .empty-card p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      max-width: 360px;
      line-height: 1.6;
    }

    .empty-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 20px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      color: white;
      font-weight: 700;
      font-size: 13.5px;
      text-decoration: none;
      margin-top: 6px;
      box-shadow: 0 8px 20px rgba(99,102,241,0.26);
      transition: all 0.2s ease;
    }

    .empty-action:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(99,102,241,0.34); }

    /* ── COMPARE BAR ────────────────────────────────────── */
    .compare-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: space-between;
      padding: 16px 20px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(6,182,212,0.07));
      border: 1px solid rgba(99,102,241,0.18);
      box-shadow: var(--shadow);
      color: var(--heading);
      font-weight: 700;
    }

    /* ── SKELETON CARDS ─────────────────────────────────── */
    .skeleton-card {
      min-height: 240px;
      display: grid;
      gap: 14px;
      align-content: start;
    }

    .skeleton-card span,
    .skeleton-card strong,
    .skeleton-card p,
    .skeleton-card em {
      display: block;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04));
      background-size: 220% 100%;
      animation: skeletonPulse 1.5s ease-in-out infinite;
    }

    .skeleton-card span { width: 40%; height: 14px; }
    .skeleton-card strong { width: 65%; height: 22px; }
    .skeleton-card p { width: 90%; height: 72px; border-radius: 18px; }
    .skeleton-card em { width: 52%; height: 32px; }

    @keyframes skeletonPulse {
      from { background-position: 120% 0; }
      to   { background-position: -120% 0; }
    }

    /* ── RECENT SECTION ─────────────────────────────────── */
    .recent-section { display: grid; gap: 16px; }

    .recent-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .recent-head h3 {
      margin: 0;
      color: var(--heading);
      font-size: 19px;
      font-weight: 800;
    }

    .carousel-actions { display: flex; gap: 8px; }

    .carousel-actions button {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 11px;
      color: var(--text);
      background: var(--surface-3);
      cursor: pointer;
      font-size: 22px;
      font-weight: 800;
      transition: all 0.2s ease;
    }

    .carousel-actions button:hover {
      transform: translateY(-1px);
      border-color: rgba(99,102,241,0.24);
      box-shadow: 0 8px 20px rgba(99,102,241,0.12);
    }

    .recent-carousel {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(250px, 300px);
      gap: 14px;
      overflow-x: auto;
      padding: 4px 4px 12px;
      scroll-behavior: smooth;
      scrollbar-width: thin;
    }

    .recent-card {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 12px;
      min-height: 130px;
      padding: 16px;
      border-radius: 18px;
      text-decoration: none;
      color: var(--text);
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: all 0.24s ease;
    }

    .recent-card:hover {
      transform: translateY(-3px) scale(1.01);
      border-color: rgba(99,102,241,0.24);
      box-shadow: 0 18px 40px rgba(0,0,0,0.20);
    }

    .avatar {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      color: white;
      font-weight: 800;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 4px 12px rgba(99,102,241,0.24);
    }

    .recent-card h4 {
      margin: 0 0 4px;
      color: var(--heading);
      font-size: 14.5px;
      font-weight: 700;
    }

    .recent-card p {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }

    .recent-card time {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    /* ── MODAL OVERLAY ──────────────────────────────────── */
    .kit-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2600;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(2,6,23,0.68);
      backdrop-filter: blur(12px);
      animation: fadeIn 0.18s ease;
    }

    .kit-panel {
      width: min(980px, 100%);
      max-height: calc(100vh - 44px);
      overflow-y: auto;
      padding: 28px;
      border-radius: 24px;
      background: color-mix(in srgb, #0d1424 94%, white 6%);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 32px 80px rgba(0,0,0,0.40);
      animation: fadeInUp 0.22s ease;
    }

    :host-context(.light-theme-root) .kit-panel {
      background: rgba(255,255,255,0.97);
      border-color: rgba(15,23,42,0.10);
    }

    .kit-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 22px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    .kit-head h3 {
      margin: 0 0 6px;
      color: var(--heading);
      font-size: 24px;
      font-weight: 800;
    }

    .kit-head span {
      color: var(--muted);
      font-weight: 600;
      font-size: 14px;
    }

    .kit-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    .kit-section {
      padding: 20px;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .kit-section h4 {
      margin: 0 0 14px;
      color: var(--heading);
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .kit-section ol {
      margin: 0;
      padding-left: 20px;
      color: var(--text);
      line-height: 1.65;
    }

    .kit-section li + li { margin-top: 10px; }

    /* ── COMPARISON ─────────────────────────────────────── */
    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 16px;
    }

    .comparison-card {
      padding: 18px;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .comparison-card h4 { margin: 0 0 6px; color: var(--heading); font-weight: 800; }
    .comparison-card p { margin: 0 0 8px; color: var(--muted); font-size: 13.5px; }
    .comparison-card strong { display: block; margin-bottom: 10px; color: var(--heading); font-size: 13px; }

    .compact-tags { margin-top: 10px; }

    /* ── PAGINATION ─────────────────────────────────────── */
    .pagination-bar {
      justify-content: center;
      padding: 0;
      margin: 0;
    }

    .page-numbers {
      display: flex;
      gap: 6px;
    }

    /* ── ANIMATIONS (fallback if not in global) ─────────── */
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── RESPONSIVE ─────────────────────────────────────── */
    @media (max-width: 1100px) {
      .cards-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 800px) {
      .filters-grid,
      .info-grid { grid-template-columns: 1fr; }

      .field-wide { grid-column: span 1; }

      .card-footer { flex-direction: column; align-items: flex-start; }

      .kit-grid,
      .comparison-grid { grid-template-columns: 1fr; }

      .candidate-header { gap: 10px; }
    }
  `]
})
export class CandidatesComponent {
  @HostBinding('class.candidates-host') hostClass = true;

  private candidateService = inject(CandidateService);
  private alertService = inject(AlertService);

  roles = keycloak.realmAccess?.roles || [];
  candidates: CandidateResponse[] = [];
  candidatesLoading = false;
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  resultMode: 'paged' | 'search' | 'filter' | 'shortlist' | 'job' = 'paged';
  readonly skeletonCards = [1, 2, 3, 4];
  expandedExperienceIds = new Set<string>();
  interviewKit: InterviewKitResponse | null = null;
  generatingKitForId: string | null = null;
  jobMatch: JobMatchResponse | null = null;
  jobMatchLoading = false;
  selectedCandidateIds: string[] = [];
  comparisonResult: CandidateCompareResponse | null = null;

  aiMode: 'search' | 'job' = 'search';
  aiMatchText = '';
  minExperienceYears: number | null = null;
  minExperienceMonths: number | null = null;
  readonly statuses: CandidateStatus[] = ['NEEDS_REVIEW', 'NEW', 'REVIEWED', 'INTERVIEW', 'REJECTED', 'HIRED'];

  filter: CandidateFilterRequest = {
    fullName: '',
    skill: '',
    seniorityLevel: '',
    minExperience: null,
    currentJobTitle: '',
    status: ''
  };

  ngOnInit(): void {
    this.loadCandidates();
  }

  loadCandidates(page = 0): void {
    this.resultMode = 'paged';
    this.jobMatch = null;
    const requestedPage = Math.max(0, page);
    this.candidatesLoading = true;
    this.candidateService.getCandidatesPage(requestedPage, this.pageSize).subscribe({
      next: (res) => {
        this.candidates = res.content;
        this.currentPage = res.currentPage;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.candidatesLoading = false;
      },
      error: () => {
        this.candidates = [];
        this.currentPage = 0;
        this.totalPages = 0;
        this.totalElements = 0;
        this.candidatesLoading = false;
      }
    });
  }

  nextPage(): void {
    if (this.resultMode === 'paged' && this.currentPage < this.totalPages - 1) {
      this.loadCandidates(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.resultMode === 'paged' && this.currentPage > 0) {
      this.loadCandidates(this.currentPage - 1);
    }
  }

  visiblePages(): number[] {
    if (this.resultMode !== 'paged' || this.totalPages <= 0) {
      return [];
    }

    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 5);
    return Array.from({ length: end - start }, (_, index) => start + index);
  }

  get showPagination(): boolean {
    return !this.candidatesLoading && this.resultMode === 'paged' && this.totalPages > 1;
  }

  private clearPaginationForResults(total: number): void {
    this.currentPage = 0;
    this.totalPages = 0;
    this.totalElements = total;
  }

  setAiMode(mode: 'search' | 'job'): void {
    this.aiMode = mode;
    this.jobMatch = null;
  }

  useAiExample(example: string): void {
    this.aiMatchText = example;
  }

  runAiMatch(): void {
    const text = this.aiMatchText.trim();
    if (!text) {
      return;
    }

    if (this.aiMode === 'job') {
      this.matchJobDescription(text);
      return;
    }

    this.jobMatchLoading = true;
    this.candidatesLoading = true;
    this.resultMode = 'search';
    this.jobMatch = null;
    this.candidateService.smartSearch({ query: text }).subscribe({
      next: (res) => {
        this.candidates = res;
        this.clearPaginationForResults(res.length);
        this.jobMatchLoading = false;
        this.candidatesLoading = false;
      },
      error: () => {
        this.candidates = [];
        this.clearPaginationForResults(0);
        this.jobMatchLoading = false;
        this.candidatesLoading = false;
      }
    });
  }

  applyCombinedFilter(): void {
    this.filter.minExperience = this.totalExperience(this.minExperienceYears, this.minExperienceMonths);
    this.candidatesLoading = true;
    this.resultMode = 'filter';
    this.candidateService.filterCandidates(this.filter).subscribe({
      next: (res) => {
        this.candidates = res;
        this.clearPaginationForResults(res.length);
        this.candidatesLoading = false;
      },
      error: () => {
        this.candidates = [];
        this.clearPaginationForResults(0);
        this.candidatesLoading = false;
      }
    });
  }

  resetFilters(): void {
    this.minExperienceYears = null;
    this.minExperienceMonths = null;
    this.filter = {
      fullName: '',
      skill: '',
      seniorityLevel: '',
      minExperience: null,
      currentJobTitle: '',
      status: ''
    };
    this.loadCandidates(0);
  }

  loadShortlisted(): void {
    this.candidatesLoading = true;
    this.resultMode = 'shortlist';
    this.candidateService.getShortlistedCandidates().subscribe({
      next: (res) => {
        this.candidates = res;
        this.clearPaginationForResults(res.length);
        this.candidatesLoading = false;
      },
      error: () => {
        this.candidates = [];
        this.clearPaginationForResults(0);
        this.candidatesLoading = false;
      }
    });
  }

  changeStatus(candidate: CandidateResponse, status: string): void {
    this.candidateService.updateStatus(candidate.id, status as CandidateStatus).subscribe({
      next: (updated) => {
        Object.assign(candidate, updated);
      },
      error: () => {
        this.alertService.alert({
          title: 'Status update failed',
          message: 'Could not update the recruitment status.',
          kind: 'danger'
        });
      }
    });
  }

  toggleShortlist(candidate: CandidateResponse): void {
    this.candidateService.toggleShortlist(candidate.id).subscribe({
      next: (updated) => {
        Object.assign(candidate, updated);
      },
      error: () => {
        this.alertService.alert({
          title: 'Shortlist update failed',
          message: 'Could not update the shortlist state.',
          kind: 'danger'
        });
      }
    });
  }

  statusLabel(status: string | null | undefined): string {
    if (!status) {
      return 'New';
    }
    return status
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  matchJobDescription(description = this.aiMatchText.trim()): void {
    if (!description) {
      return;
    }

    this.jobMatchLoading = true;
    this.candidatesLoading = true;
    this.resultMode = 'job';
    this.candidateService.matchJobDescription({ description }).subscribe({
      next: (result) => {
        this.jobMatch = result;
        this.candidates = result.candidates;
        this.clearPaginationForResults(result.candidates.length);
        this.jobMatchLoading = false;
        this.candidatesLoading = false;
      },
      error: () => {
        this.candidates = [];
        this.clearPaginationForResults(0);
        this.jobMatchLoading = false;
        this.candidatesLoading = false;
        this.alertService.alert({
          title: 'Job match failed',
          message: 'Could not analyze this job description.',
          kind: 'danger'
        });
      }
    });
  }

  clearJobMatch(): void {
    this.jobMatch = null;
    this.loadCandidates(0);
  }

  clearAiMatch(): void {
    this.aiMatchText = '';
    this.jobMatch = null;
    this.loadCandidates(0);
  }

  isSelected(candidateId: string): boolean {
    return this.selectedCandidateIds.includes(candidateId);
  }

  toggleCandidateSelection(candidateId: string): void {
    if (this.isSelected(candidateId)) {
      this.selectedCandidateIds = this.selectedCandidateIds.filter((id) => id !== candidateId);
      return;
    }

    if (this.selectedCandidateIds.length >= 3) {
      this.alertService.alert({
        title: 'Comparison limit',
        message: 'Select up to 3 candidates for comparison.',
        kind: 'info'
      });
      return;
    }

    this.selectedCandidateIds = [...this.selectedCandidateIds, candidateId];
  }

  compareSelectedCandidates(): void {
    if (this.selectedCandidateIds.length < 2) {
      return;
    }

    this.candidateService.compareCandidates(this.selectedCandidateIds).subscribe({
      next: (result) => this.comparisonResult = result,
      error: () => {
        this.alertService.alert({
          title: 'Comparison failed',
          message: 'Could not compare the selected candidates.',
          kind: 'danger'
        });
      }
    });
  }

  clearSelection(): void {
    this.selectedCandidateIds = [];
  }

  closeComparison(): void {
    this.comparisonResult = null;
  }

  get recentCandidates(): CandidateResponse[] {
    return [...this.candidates]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 8);
  }

  initials(name: string | null | undefined): string {
    const parts = (name || 'Candidate')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'CV';
  }

  relativeDate(value: string | null | undefined): string {
    if (!value) {
      return 'Recently added';
    }

    const diffMs = Date.now() - new Date(value).getTime();
    const days = Math.max(0, Math.floor(diffMs / 86_400_000));
    if (days === 0) {
      return 'Today';
    }
    if (days === 1) {
      return '1 day ago';
    }
    if (days < 30) {
      return `${days} days ago`;
    }
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  scrollRecent(container: HTMLElement, direction: number): void {
    container.scrollBy({
      left: direction * 340,
      behavior: 'smooth'
    });
  }

  breakdownItems(breakdown: ScoreBreakdownResponse): Array<{ label: string; value: number }> {
    return [
      { label: 'Skills', value: Math.round(breakdown.skillsMatch || 0) },
      { label: 'Experience', value: Math.round(breakdown.experienceMatch || 0) },
      { label: 'Seniority', value: Math.round(breakdown.seniorityMatch || 0) },
      { label: 'Title', value: Math.round(breakdown.titleMatch || 0) },
      { label: 'Semantic', value: Math.round(breakdown.semanticMatch || 0) }
    ];
  }

  scoreColor(value: number): string {
    if (value < 50) return 'linear-gradient(135deg, #ef4444, #f97316)';
    if (value < 75) return 'linear-gradient(135deg, #f59e0b, #eab308)';
    return 'linear-gradient(135deg, #22c55e, #06b6d4)';
  }

  hasNonExperienceDetails(candidate: CandidateResponse): boolean {
    return Boolean(
      candidate.projectEntries.length ||
      candidate.educationEntries.length ||
      candidate.certifications.length
    );
  }

  isExperienceExpanded(candidateId: string): boolean {
    return this.expandedExperienceIds.has(candidateId);
  }

  toggleExperienceDetails(candidateId: string): void {
    if (this.expandedExperienceIds.has(candidateId)) {
      this.expandedExperienceIds.delete(candidateId);
      this.expandedExperienceIds = new Set(this.expandedExperienceIds);
      return;
    }

    this.expandedExperienceIds = new Set(this.expandedExperienceIds).add(candidateId);
  }

  formatExperience(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'Not specified';
    }

    const totalMonths = Math.max(0, Math.round(Number(value) * 12));
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years === 0 && months === 0) {
      return 'Less than 1 month';
    }

    const parts: string[] = [];
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    }
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    }
    return parts.join(' ');
  }

  private totalExperience(years: number | null, months: number | null): number | null {
    const cleanYears = Math.max(0, Number(years) || 0);
    const cleanMonths = Math.max(0, Math.min(11, Number(months) || 0));

    if (cleanYears === 0 && cleanMonths === 0) {
      return null;
    }

    return Math.round((cleanYears + cleanMonths / 12) * 100) / 100;
  }

  generateInterviewKit(candidate: CandidateResponse): void {
    this.generatingKitForId = candidate.id;
    this.candidateService.generateInterviewKit(candidate.id).subscribe({
      next: (kit) => {
        this.interviewKit = kit;
        this.generatingKitForId = null;
      },
      error: () => {
        this.generatingKitForId = null;
        this.alertService.alert({
          title: 'Interview kit failed',
          message: 'Could not generate the interview kit for this candidate.',
          kind: 'danger'
        });
      }
    });
  }

  closeInterviewKit(): void {
    this.interviewKit = null;
  }

  viewOriginalCv(candidate: CandidateResponse): void {
    this.candidateService.viewCv(candidate.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.alertService.alert({
          title: 'CV view failed',
          message: 'Could not open the original CV from Alfresco.',
          kind: 'danger'
        });
      }
    });
  }

  downloadOriginalCv(candidate: CandidateResponse): void {
    this.candidateService.downloadCv(candidate.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = candidate.cvFileName || 'candidate-cv';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.alertService.alert({
          title: 'CV download failed',
          message: 'Could not download the original CV from Alfresco.',
          kind: 'danger'
        });
      }
    });
  }

  exportCandidate(candidate: CandidateResponse): void {
    this.candidateService.exportCandidate(candidate.id).subscribe({
      next: (blob) => this.downloadBlob(blob, `${candidate.fullName || 'candidate'}-profile.pdf`),
      error: () => {
        this.alertService.alert({
          title: 'Export failed',
          message: 'Could not export this candidate.',
          kind: 'danger'
        });
      }
    });
  }

  exportShortlist(): void {
    this.candidateService.exportShortlist().subscribe({
      next: (blob) => this.downloadBlob(blob, 'shortlisted-candidates.pdf'),
      error: () => {
        this.alertService.alert({
          title: 'Export failed',
          message: 'Could not export the shortlist.',
          kind: 'danger'
        });
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/[^\w.-]+/g, '-');
    link.click();
    URL.revokeObjectURL(url);
  }

  async deleteCandidate(candidateOrId: CandidateResponse | string): Promise<void> {
    const candidate = typeof candidateOrId === 'string'
      ? this.candidates.find((item) => item.id === candidateOrId)
      : candidateOrId;

    if (!candidate) {
      await this.alertService.alert({
        title: 'Delete failed',
        message: 'The selected candidate could not be found.',
        kind: 'danger'
      });
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'Delete candidate',
      message: `Delete ${candidate.fullName || 'this candidate'} and their CV data? This cannot be undone.`,
      confirmText: 'Delete',
      kind: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.candidateService.deleteCandidate(candidate.id).subscribe({
      next: () => this.loadCandidates(this.resultMode === 'paged' ? this.currentPage : 0),
      error: () => {
        this.alertService.alert({
          title: 'Delete failed',
          message: 'The candidate could not be deleted. Please try again.',
          kind: 'danger'
        });
      }
    });
  }
}
