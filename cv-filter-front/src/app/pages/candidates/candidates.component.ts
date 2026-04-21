import { Component, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import keycloak from '../../keycloak';
import {
  CandidateService,
  CandidateResponse,
  CandidateFilterRequest
} from '../../services/candidate.service';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="candidates-page">
      <div class="search-card">
        <div class="search-head">
          <div>
            <p class="eyebrow">AI Recruitment Search</p>
            <h2>Find the best profile</h2>
          </div>
        </div>

        <div class="search-bar">
          <input
            [(ngModel)]="smartQuery"
            placeholder="Try: senior java backend developer with spring boot" />
          <button class="primary-btn" (click)="applySmartSearch()">✦ AI Search</button>
        </div>
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
            <input type="number" step="0.1" [(ngModel)]="filter.minExperience" placeholder="0.0" />
          </div>

          <div class="field field-wide">
            <label>Job Title</label>
            <input [(ngModel)]="filter.currentJobTitle" placeholder="developer / engineer / intern" />
          </div>
        </div>

        <div class="action-row">
          <button class="primary-btn" (click)="applyCombinedFilter()">⚡ Apply Filter</button>
          <button class="secondary-btn" (click)="resetFilters()">↺ Reset</button>
          <button class="secondary-btn" (click)="loadCandidates()">◎ Load All</button>
        </div>
      </div>

      @if (candidates.length === 0) {
        <div class="empty-card">
          <h3>No candidates found</h3>
          <p>Try a different query or clear the filters.</p>
        </div>
      }

      <div class="cards-grid">
        @for (candidate of candidates; track candidate.id) {
          <div class="candidate-card">
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
                <strong>{{ candidate.yearsOfExperience }}</strong>
              </div>

              <div class="info-item field-wide">
                <span>Location</span>
                <strong>{{ candidate.address || '—' }}</strong>
              </div>

              <div class="info-item field-wide">
                <span>Degree</span>
                <strong>{{ candidate.highestDegree || '—' }}</strong>
              </div>
            </div>

            <div class="tags-section">
              <p>Skills</p>
              <div class="tags">
                @for (skill of candidate.skills; track skill) {
                  <span class="tag">{{ skill }}</span>
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

            <div class="card-footer">
              <span class="file-name">{{ candidate.cvFileName }}</span>

              <div class="card-actions">
                <button class="secondary-btn small" [routerLink]="['/candidates/edit', candidate.id]">✎ Edit</button>

                @if (roles.includes('ADMIN')) {
                  <button class="danger-btn small" (click)="deleteCandidate(candidate.id)">🗑 Delete</button>
                }
              </div>
            </div>
          </div>
        }
      </div>
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

    .search-card,
    .filters-card,
    .empty-card,
    .candidate-card {
      padding: 24px;
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
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

    .search-bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
    }

    .search-bar input,
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
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(79,70,229,0.18);
      border: 1px solid rgba(99,102,241,0.22);
      color: #c7d2fe;
      font-size: 13px;
      font-weight: 600;
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
      .search-bar {
        grid-template-columns: 1fr;
      }

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
    }
  `]
})
export class CandidatesComponent {
  @HostBinding('class.candidates-host') hostClass = true;

  private candidateService = inject(CandidateService);

  roles = keycloak.realmAccess?.roles || [];
  candidates: CandidateResponse[] = [];

  smartQuery = '';

  filter: CandidateFilterRequest = {
    fullName: '',
    skill: '',
    seniorityLevel: '',
    minExperience: null,
    currentJobTitle: ''
  };

  ngOnInit(): void {
    this.loadCandidates();
  }

  loadCandidates(): void {
    this.candidateService.getAllCandidates().subscribe({
      next: (res) => this.candidates = res,
      error: () => this.candidates = []
    });
  }

  applySmartSearch(): void {
    if (!this.smartQuery.trim()) {
      return;
    }

    this.candidateService.smartSearch({ query: this.smartQuery }).subscribe({
      next: (res) => this.candidates = res,
      error: () => this.candidates = []
    });
  }

  applyCombinedFilter(): void {
    this.candidateService.filterCandidates(this.filter).subscribe({
      next: (res) => this.candidates = res,
      error: () => this.candidates = []
    });
  }

  resetFilters(): void {
    this.smartQuery = '';
    this.filter = {
      fullName: '',
      skill: '',
      seniorityLevel: '',
      minExperience: null,
      currentJobTitle: ''
    };
    this.loadCandidates();
  }

  deleteCandidate(id: string): void {
    this.candidateService.deleteCandidate(id).subscribe({
      next: () => this.loadCandidates(),
      error: () => alert('Delete failed')
    });
  }
}