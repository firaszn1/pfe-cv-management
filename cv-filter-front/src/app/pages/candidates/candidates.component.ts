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
        <h3>Manual Filters</h3>

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
          <h3>No candidates found</h3>
          <p>Try a different query or clear the filters.</p>
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
            <button
              class="star-toggle"
              [class.active]="candidate.shortlisted"
              (click)="toggleShortlist(candidate)"
              [title]="candidate.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'"
              [attr.aria-label]="candidate.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'">
              {{ candidate.shortlisted ? '★' : '☆' }}
            </button>

            <label class="select-line">
              <input
                type="checkbox"
                [checked]="isSelected(candidate.id)"
                (change)="toggleCandidateSelection(candidate.id)" />
              <span>Compare</span>
            </label>
            <div class="candidate-top">
              <div>
                <h3>{{ candidate.fullName }}</h3>
                <p class="job-title">{{ candidate.currentJobTitle || 'No job title' }}</p>
              </div>

              @if (candidate.aiMatchScore !== null) {
                <div class="score-badge">
                  {{ candidate.aiMatchScore }}%
                </div>
              }
            </div>

            <div class="lifecycle-row">
              <div class="status-segmented" role="group" aria-label="Candidate status">
                @for (status of statuses; track status) {
                  <button
                    type="button"
                    [class.active]="candidate.status === status"
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
                <button class="secondary-btn small" [routerLink]="['/candidates/edit', candidate.id]">✎ Edit</button>

                @if (roles.includes('ADMIN')) {
                  <button class="danger-btn small" (click)="deleteCandidate(candidate.id)">🗑 Delete</button>
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
      --surface: rgba(255,255,255,0.05);
      --surface-2: rgba(255,255,255,0.04);
      --surface-3: rgba(255,255,255,0.08);
      --border: rgba(255,255,255,0.08);
      --text: #e5eef8;
      --heading: #f8fafc;
      --muted: #94a3b8;
      --accent-1: #4f46e5;
      --accent-2: #06b6d4;
      --danger-1: #ef4444;
      --danger-2: #f97316;
      --shadow: 0 16px 40px rgba(0,0,0,0.2);
    }

    :host-context(.light-theme-root) {
      --surface: rgba(255,255,255,0.78);
      --surface-2: rgba(255,255,255,0.70);
      --surface-3: rgba(15,23,42,0.06);
      --border: rgba(15,23,42,0.08);
      --text: #1e293b;
      --heading: #0f172a;
      --muted: #64748b;
      --accent-1: #4338ca;
      --accent-2: #0891b2;
      --danger-1: #dc2626;
      --danger-2: #ea580c;
      --shadow: 0 18px 40px rgba(15,23,42,0.08);
    }

    .candidates-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: var(--text);
    }

    .ai-match-card,
    .filters-card,
    .empty-card,
    .candidate-card,
    .recent-section {
      padding: 24px;
      border-radius: 20px;
      background: linear-gradient(145deg, var(--surface), rgba(255,255,255,0.025));
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }

    .search-head {
      margin-bottom: 16px;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #93c5fd;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    :host-context(.light-theme-root) .eyebrow {
      color: #2563eb;
    }

    .search-head h2 {
      margin: 0;
      font-size: 30px;
      color: var(--heading);
    }

    .ai-match-card textarea,
    .field input,
    .field select {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      outline: none;
    }

    .mode-tabs {
      display: inline-flex;
      gap: 6px;
      padding: 5px;
      margin-bottom: 14px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .mode-tabs button {
      border: none;
      border-radius: 12px;
      padding: 10px 14px;
      cursor: pointer;
      color: var(--muted);
      background: transparent;
      font-weight: 900;
    }

    .mode-tabs button.active {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 10px 18px rgba(79,70,229,0.18);
    }

    .experience-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .ai-match-card textarea {
      min-height: 130px;
      resize: vertical;
      box-sizing: border-box;
      line-height: 1.5;
    }

    .extracted-row,
    .compare-bar,
    .select-line {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .extracted-row {
      margin-top: 14px;
      color: var(--muted);
      font-weight: 700;
    }

    .extracted-row em {
      padding: 7px 10px;
      border-radius: 999px;
      color: #c7d2fe;
      background: rgba(79,70,229,0.18);
      font-style: normal;
      font-size: 13px;
    }

    :host-context(.light-theme-root) .extracted-row em {
      color: #4338ca;
    }

    .filters-card h3 {
      margin: 0 0 18px;
      font-size: 22px;
      color: var(--heading);
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
    }

    .field-wide {
      grid-column: span 2;
    }

    .action-row {
      display: flex;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
    }

    .primary-btn,
    .secondary-btn,
    .danger-btn {
      border: none;
      cursor: pointer;
      border-radius: 14px;
      padding: 13px 18px;
      font-weight: 800;
      transition: 0.2s ease;
    }

    .primary-btn {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 12px 24px rgba(79,70,229,0.22);
    }

    .secondary-btn {
      color: var(--text);
      background: var(--surface-3);
      border: 1px solid var(--border);
    }

    .danger-btn {
      color: white;
      background: linear-gradient(135deg, var(--danger-1), var(--danger-2));
    }

    .primary-btn:hover,
    .secondary-btn:hover,
    .danger-btn:hover {
      transform: translateY(-1px);
    }

    .small {
      padding: 10px 14px;
      font-size: 13px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .candidate-card {
      position: relative;
      overflow: hidden;
      transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
      padding-top: 28px;
    }

    .candidate-card:hover {
      transform: translateY(-3px);
      border-color: rgba(6,182,212,0.22);
      box-shadow: 0 22px 54px rgba(6,182,212,0.10);
    }

    .select-line {
      padding-right: 56px;
      margin-bottom: 12px;
      color: var(--muted);
      font-weight: 800;
      font-size: 13px;
    }

    .star-toggle {
      position: absolute;
      top: 18px;
      right: 18px;
      z-index: 2;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 14px;
      color: #c7d2fe;
      background: var(--surface-3);
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
      transition: transform 0.22s ease, color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
    }

    .star-toggle:hover {
      transform: translateY(-2px) scale(1.04);
      border-color: rgba(6,182,212,0.28);
      box-shadow: 0 12px 26px rgba(6,182,212,0.12);
    }

    .star-toggle.active {
      color: #fef3c7;
      background: rgba(245,158,11,0.16);
      border-color: rgba(245,158,11,0.34);
      box-shadow: 0 0 0 4px rgba(245,158,11,0.08), 0 12px 26px rgba(245,158,11,0.12);
    }

    .star-toggle:active {
      transform: scale(0.94);
    }

    .candidate-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .candidate-top h3 {
      margin: 0 0 6px;
      font-size: 22px;
      color: var(--heading);
    }

    .job-title {
      margin: 0;
      color: var(--muted);
    }

    .score-badge {
      min-width: 82px;
      text-align: center;
      padding: 10px 14px;
      border-radius: 16px;
      font-weight: 800;
      color: white;
      background: linear-gradient(135deg, #22c55e, #06b6d4);
      box-shadow: 0 12px 26px rgba(6,182,212,0.22);
    }

    .lifecycle-row {
      margin-bottom: 18px;
    }

    .status-segmented {
      display: flex;
      gap: 6px;
      padding: 6px;
      overflow-x: auto;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      scrollbar-width: thin;
    }

    .status-segmented button {
      flex: 0 0 auto;
      min-width: 92px;
      border: 0;
      border-radius: 13px;
      padding: 10px 12px;
      cursor: pointer;
      color: var(--muted);
      background: transparent;
      font-size: 12px;
      font-weight: 900;
      transition: transform 0.22s ease, box-shadow 0.22s ease, color 0.22s ease, background 0.22s ease;
    }

    .status-segmented button:hover {
      color: var(--heading);
      transform: translateY(-1px);
    }

    .status-segmented button.active {
      color: #fff;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 10px 22px rgba(6,182,212,0.18);
    }

    .score-breakdown {
      display: grid;
      gap: 8px;
      margin-bottom: 18px;
      padding: 14px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .score-row {
      display: grid;
      grid-template-columns: 92px 1fr 48px;
      align-items: center;
      gap: 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .score-track {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(148,163,184,0.16);
    }

    .score-track i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
    }

    .score-row strong {
      color: var(--heading);
      text-align: right;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 18px;
    }

    .info-item {
      padding: 14px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .info-item span {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .info-item strong {
      color: var(--heading);
      line-height: 1.5;
    }

    .profile-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .profile-links a {
      color: #93c5fd;
      font-weight: 800;
      text-decoration: none;
    }

    .tags-section {
      margin-bottom: 16px;
    }

    .tags-section p {
      margin: 0 0 10px;
      color: var(--muted);
      font-weight: 600;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(79,70,229,0.18);
      border: 1px solid rgba(99,102,241,0.22);
      color: #c7d2fe;
      font-size: 13px;
      font-weight: 600;
      transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    }

    .tag:hover {
      transform: translateY(-1px);
      border-color: rgba(6,182,212,0.28);
    }

    .skill-tag i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 10px rgba(34,211,238,0.48);
    }

    :host-context(.light-theme-root) .tag {
      color: #4338ca;
    }

    .tag.alt {
      background: rgba(6,182,212,0.14);
      border-color: rgba(34,211,238,0.18);
      color: #a5f3fc;
    }

    :host-context(.light-theme-root) .tag.alt {
      color: #0f766e;
    }

    .details-section {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
      padding: 14px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .details-section p {
      margin: 0 0 8px;
      color: var(--muted);
      font-weight: 800;
    }

    .experience-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .experience-toggle-row p {
      margin: 0;
    }

    .details-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 8px 12px;
      color: var(--text);
      background: var(--surface-3);
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .details-toggle:hover {
      transform: translateY(-1px);
      border-color: rgba(6,182,212,0.26);
      box-shadow: 0 10px 22px rgba(6,182,212,0.08);
    }

    .details-toggle span {
      display: inline-block;
      transition: transform 0.22s ease;
    }

    .details-toggle span.open {
      transform: rotate(180deg);
    }

    .experience-collapse {
      display: grid;
      gap: 12px;
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-4px);
      transition: max-height 0.28s ease, opacity 0.22s ease, transform 0.22s ease;
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
      line-height: 1.55;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }

    .file-name {
      color: var(--muted);
      font-size: 13px;
      word-break: break-word;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 10px 13px;
      cursor: pointer;
      color: var(--text);
      background: var(--surface-3);
      font-size: 13px;
      font-weight: 900;
      transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .icon-btn span {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 9px;
      color: transparent;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 8px 16px rgba(79,70,229,0.18);
    }

    .icon-btn:hover {
      transform: translateY(-2px);
      border-color: rgba(6,182,212,0.26);
      box-shadow: 0 12px 24px rgba(6,182,212,0.10);
    }

    .icon-btn:active,
    .primary-btn:active,
    .secondary-btn:active,
    .danger-btn:active {
      transform: translateY(0) scale(0.98);
    }

    .icon-btn.active {
      color: #fef3c7;
      border-color: rgba(245,158,11,0.28);
      background: rgba(245,158,11,0.14);
    }

    .icon-btn:disabled {
      cursor: not-allowed;
      opacity: 0.48;
      transform: none;
    }

    .recent-section {
      display: grid;
      gap: 16px;
    }

    .recent-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .carousel-actions {
      display: flex;
      gap: 8px;
    }

    .carousel-actions button {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 13px;
      color: var(--text);
      background: var(--surface-3);
      cursor: pointer;
      font-size: 24px;
      font-weight: 900;
      transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .carousel-actions button:hover {
      transform: translateY(-2px);
      border-color: rgba(6,182,212,0.26);
      box-shadow: 0 12px 24px rgba(6,182,212,0.10);
    }

    .recent-head h3 {
      margin: 0;
      color: var(--heading);
      font-size: 22px;
    }

    .recent-carousel {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(260px, 320px);
      gap: 14px;
      overflow-x: auto;
      padding: 4px 4px 12px;
      scroll-behavior: smooth;
      scrollbar-width: thin;
    }

    .recent-card {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 12px;
      min-height: 138px;
      padding: 16px;
      border-radius: 18px;
      text-decoration: none;
      color: var(--text);
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
    }

    .recent-card:hover {
      transform: translateY(-3px) scale(1.01);
      border-color: rgba(6,182,212,0.28);
      box-shadow: 0 18px 38px rgba(6,182,212,0.10);
    }

    .avatar {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      color: white;
      font-weight: 900;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
    }

    .recent-card h4 {
      margin: 0 0 5px;
      color: var(--heading);
      font-size: 16px;
    }

    .recent-card p {
      margin: 0 0 10px;
      color: var(--muted);
      line-height: 1.35;
    }

    .recent-card time {
      display: block;
      margin-top: 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .skeleton-card {
      min-height: 260px;
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
      background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12), rgba(255,255,255,0.05));
      background-size: 220% 100%;
      animation: skeletonPulse 1.4s ease-in-out infinite;
    }

    .skeleton-card span { width: 42%; height: 16px; }
    .skeleton-card strong { width: 68%; height: 24px; }
    .skeleton-card p { width: 88%; height: 80px; border-radius: 18px; }
    .skeleton-card em { width: 56%; height: 34px; }

    @keyframes skeletonPulse {
      from { background-position: 120% 0; }
      to { background-position: -120% 0; }
    }

    .compare-bar {
      justify-content: space-between;
      padding: 16px 18px;
      border-radius: 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      color: var(--heading);
      font-weight: 800;
    }

    .kit-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2600;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(2, 6, 23, 0.62);
      backdrop-filter: blur(10px);
    }

    .kit-panel {
      width: min(980px, 100%);
      max-height: calc(100vh - 44px);
      overflow-y: auto;
      padding: 24px;
      border-radius: 24px;
      background: color-mix(in srgb, #111827 92%, white 8%);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 28px 80px rgba(0,0,0,0.34);
    }

    :host-context(.light-theme-root) .kit-panel {
      background: rgba(255,255,255,0.96);
      border-color: rgba(15,23,42,0.10);
    }

    .kit-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .kit-head h3 {
      margin: 0 0 6px;
      color: var(--heading);
      font-size: 26px;
    }

    .kit-head span {
      color: var(--muted);
      font-weight: 700;
    }

    .kit-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }

    .kit-section {
      padding: 18px;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .kit-section h4 {
      margin: 0 0 12px;
      color: var(--heading);
    }

    .kit-section ol {
      margin: 0;
      padding-left: 20px;
      color: var(--text);
      line-height: 1.6;
    }

    .kit-section li + li {
      margin-top: 9px;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 14px;
    }

    .comparison-card {
      padding: 16px;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .comparison-card h4 {
      margin: 0 0 6px;
      color: var(--heading);
    }

    .comparison-card p {
      margin: 0 0 8px;
      color: var(--muted);
    }

    .comparison-card strong {
      display: block;
      margin-bottom: 10px;
      color: var(--heading);
    }

    .compact-tags {
      margin-top: 10px;
    }

    .empty-card h3 {
      margin: 0 0 8px;
      color: var(--heading);
    }

    .empty-card p {
      margin: 0;
      color: var(--muted);
    }

    @media (max-width: 1100px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 800px) {
      .filters-grid,
      .info-grid {
        grid-template-columns: 1fr;
      }

      .field-wide {
        grid-column: span 1;
      }

      .candidate-top,
      .card-footer {
        flex-direction: column;
        align-items: flex-start;
      }

      .kit-grid {
        grid-template-columns: 1fr;
      }

      .comparison-grid {
        grid-template-columns: 1fr;
      }
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
      { label: 'Title', value: Math.round(breakdown.titleMatch || 0) }
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
