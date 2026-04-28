import { Component, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateService, CandidateResponse, CandidateStatus } from '../../services/candidate.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-edit-candidate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-page">
      @if (candidate) {
        <div class="profile-hero">
          <button
            class="star-toggle"
            [class.active]="candidate.shortlisted"
            (click)="toggleShortlist()"
            [title]="candidate.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'">
            {{ candidate.shortlisted ? '★' : '☆' }}
          </button>

          <div class="profile-main">
            <div class="avatar">{{ initials(candidate.fullName) }}</div>
            <div>
              <p class="eyebrow">Candidate Profile</p>
              <h2>{{ candidate.fullName || 'Unnamed candidate' }}</h2>
              <p class="profile-title">{{ candidate.currentJobTitle || 'No job title' }}</p>
              <div class="profile-meta">
                @if (candidate.address) {
                  <span>{{ candidate.address }}</span>
                }
                @if (candidate.linkedinUrl) {
                  <a [href]="candidate.linkedinUrl" target="_blank" rel="noopener">LinkedIn</a>
                }
                @if (candidate.githubUrl) {
                  <a [href]="candidate.githubUrl" target="_blank" rel="noopener">GitHub</a>
                }
              </div>
            </div>
          </div>

          <div class="hero-actions">
            @if (candidate.aiMatchScore !== null) {
              <div class="match-card">
                <span>AI Match</span>
                <strong>{{ candidate.aiMatchScore }}%</strong>
              </div>
            }
            <button class="icon-btn" (click)="viewCv()" [disabled]="!candidate.alfrescoNodeId"><span>View</span>View CV</button>
            <button class="icon-btn" (click)="downloadCv()" [disabled]="!candidate.alfrescoNodeId"><span>Down</span>Download CV</button>
          </div>
        </div>

        @if (hasParsingWarnings()) {
          <div class="warning-card">
            <strong>Review required</strong>
            @for (warning of parsingWarningList(); track warning) {
              <span>{{ warning }}</span>
            }
          </div>
        }
        <div class="form-card">
          <div class="form-grid">
            <div class="field">
              <label>Name</label>
              <input [(ngModel)]="candidate.fullName" [class.missing-field]="isMissing(candidate.fullName)" />
            </div>

            <div class="field">
              <label>Email</label>
              <input [(ngModel)]="candidate.email" [class.missing-field]="isMissing(candidate.email)" />
            </div>

            <div class="field">
              <label>Phone</label>
              <input [(ngModel)]="candidate.phone" />
            </div>

            <div class="field">
              <label>Location</label>
              <input [(ngModel)]="candidate.address" />
            </div>

            <div class="field">
              <label>Job Title</label>
              <input [(ngModel)]="candidate.currentJobTitle" [class.missing-field]="isMissing(candidate.currentJobTitle)" />
            </div>

            <div class="field">
              <label>Degree</label>
              <input [(ngModel)]="candidate.highestDegree" />
            </div>

            <div class="field">
              <label>LinkedIn</label>
              <input [(ngModel)]="candidate.linkedinUrl" placeholder="https://linkedin.com/in/..." />
            </div>

            <div class="field">
              <label>GitHub</label>
              <input [(ngModel)]="candidate.githubUrl" placeholder="https://github.com/..." />
            </div>

            <div class="field field-wide">
              <label>Portfolio</label>
              <input [(ngModel)]="candidate.portfolioUrl" placeholder="https://..." />
            </div>

            <div class="field">
              <label>Experience</label>
              <div class="experience-inputs">
                <input type="number" min="0" step="1" [(ngModel)]="experienceYears" placeholder="Years" />
                <input type="number" min="0" max="11" step="1" [(ngModel)]="experienceMonths" placeholder="Months" />
              </div>
            </div>

            <div class="field">
              <label>Seniority</label>
              <select [(ngModel)]="candidate.seniorityLevel">
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </div>

            <div class="field field-wide">
              <label>Status</label>
              <div class="status-segmented">
                @for (status of statuses; track status) {
                  <button
                    type="button"
                    [class.active]="candidate.status === status"
                    (click)="candidate.status = status">
                    {{ statusLabel(status) }}
                  </button>
                }
              </div>
            </div>

            <div class="field field-wide">
              <label>Skills (comma separated)</label>
              <input [(ngModel)]="skillsText" [class.missing-field]="!skillsText.trim()" />
            </div>

            <div class="field field-wide">
              <label>Languages (comma separated)</label>
              <input [(ngModel)]="languagesText" />
            </div>

            <div class="field field-wide">
              <label>Education Details (one per line)</label>
              <textarea [(ngModel)]="educationText"></textarea>
            </div>

            <div class="field field-wide">
              <label>Experience Details (one per line)</label>
              <textarea [(ngModel)]="experienceText"></textarea>
            </div>

            <div class="field field-wide">
              <label>Projects (one per line)</label>
              <textarea [(ngModel)]="projectsText"></textarea>
            </div>

            <div class="field field-wide">
              <label>Certifications (one per line)</label>
              <textarea [(ngModel)]="certificationsText"></textarea>
            </div>
          </div>

          <div class="action-row">
            <button class="primary-btn" (click)="save()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
            <button class="secondary-btn" (click)="goBack()">← Cancel</button>
          </div>

          @if (message) {
            <div class="message-box">{{ message }}</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --surface: rgba(255,255,255,0.05);
      --surface-2: rgba(255,255,255,0.06);
      --border: rgba(255,255,255,0.08);
      --text: #e5eef8;
      --heading: #f8fafc;
      --muted: #94a3b8;
      --accent-1: #4f46e5;
      --accent-2: #06b6d4;
      --success-bg: rgba(34,197,94,0.12);
      --success-border: rgba(34,197,94,0.2);
      --success-text: #bbf7d0;
      --shadow: 0 16px 40px rgba(0,0,0,0.2);
    }

    :host-context(.light-theme-root) {
      --surface: rgba(255,255,255,0.78);
      --surface-2: rgba(255,255,255,0.70);
      --border: rgba(15,23,42,0.08);
      --text: #1e293b;
      --heading: #0f172a;
      --muted: #64748b;
      --accent-1: #4338ca;
      --accent-2: #0891b2;
      --success-bg: rgba(34,197,94,0.10);
      --success-border: rgba(34,197,94,0.18);
      --success-text: #15803d;
      --shadow: 0 18px 40px rgba(15,23,42,0.08);
    }

    .edit-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: var(--text);
    }

    .profile-hero,
    .warning-card,
    .form-card {
      padding: 24px;
      border-radius: 20px;
      background: linear-gradient(145deg, var(--surface), rgba(255,255,255,0.025));
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }

    .profile-hero {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: center;
      overflow: hidden;
    }

    .profile-main {
      display: flex;
      gap: 16px;
      align-items: center;
      min-width: 0;
    }

    .avatar {
      width: 68px;
      height: 68px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 20px;
      color: white;
      font-weight: 900;
      font-size: 22px;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 14px 28px rgba(79,70,229,0.22);
    }

    .profile-main h2 {
      margin: 0 0 6px;
      color: var(--heading);
      font-size: 32px;
      line-height: 1.1;
    }

    .profile-title {
      margin: 0;
      color: var(--muted);
      font-weight: 700;
    }

    .profile-meta {
      display: flex;
      gap: 9px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .profile-meta span,
    .profile-meta a {
      padding: 7px 10px;
      border-radius: 999px;
      color: #c7d2fe;
      background: rgba(79,70,229,0.16);
      border: 1px solid rgba(99,102,241,0.22);
      font-size: 12px;
      font-weight: 800;
      text-decoration: none;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
      padding-right: 54px;
    }

    .match-card {
      min-width: 92px;
      padding: 10px 12px;
      border-radius: 16px;
      color: white;
      text-align: center;
      background: linear-gradient(135deg, #22c55e, var(--accent-2));
      box-shadow: 0 12px 26px rgba(6,182,212,0.18);
    }

    .match-card span {
      display: block;
      font-size: 11px;
      font-weight: 800;
      opacity: 0.82;
    }

    .match-card strong {
      display: block;
      margin-top: 2px;
      font-size: 18px;
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
      background: var(--surface-2);
      cursor: pointer;
      font-size: 24px;
      transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
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

    .warning-card {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: #fef3c7;
      background: rgba(245,158,11,0.14);
      border-color: rgba(245,158,11,0.28);
      font-weight: 800;
    }

    .warning-card strong {
      width: 100%;
      color: var(--heading);
    }

    .warning-card span {
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(245,158,11,0.18);
      border: 1px solid rgba(245,158,11,0.30);
      font-size: 12px;
      font-weight: 900;
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

    .form-grid {
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

    .field input,
    .field select,
    .field textarea {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      outline: none;
      transition: border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
    }

    .field input:focus,
    .field select:focus,
    .field textarea:focus {
      border-color: rgba(6,182,212,0.30);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.08);
    }

    .field input.missing-field {
      border-color: rgba(245,158,11,0.62);
      background: rgba(245,158,11,0.10);
      box-shadow: 0 0 0 4px rgba(245,158,11,0.08);
    }

    .field textarea {
      min-height: 110px;
      resize: vertical;
      line-height: 1.5;
    }

    .experience-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .field-wide {
      grid-column: span 2;
    }

    .action-row {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .primary-btn,
    .secondary-btn,
    .icon-btn {
      border: none;
      cursor: pointer;
      border-radius: 14px;
      padding: 13px 18px;
      font-weight: 800;
      transition: 0.2s ease;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-size: 13px;
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

    .primary-btn {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 12px 24px rgba(79,70,229,0.22);
    }

    .secondary-btn {
      color: var(--text);
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
    }

    .primary-btn:hover,
    .secondary-btn:hover,
    .icon-btn:hover {
      transform: translateY(-1px);
    }

    .status-segmented {
      display: flex;
      gap: 6px;
      padding: 6px;
      overflow-x: auto;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .status-segmented button {
      flex: 0 0 auto;
      min-width: 96px;
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

    .message-box {
      margin-top: 18px;
      padding: 16px;
      border-radius: 16px;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: var(--success-text);
      font-weight: 700;
    }

    @media (max-width: 800px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .field-wide {
        grid-column: span 1;
      }

      .profile-hero {
        grid-template-columns: 1fr;
      }

      .hero-actions {
        justify-content: flex-start;
        padding-right: 0;
      }
    }
  `]
})
export class EditCandidateComponent {
  @HostBinding('class.edit-host') hostClass = true;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private candidateService = inject(CandidateService);
  private toastService = inject(ToastService);

  candidate: CandidateResponse | null = null;
  skillsText = '';
  languagesText = '';
  educationText = '';
  experienceText = '';
  projectsText = '';
  certificationsText = '';
  experienceYears: number | null = null;
  experienceMonths: number | null = null;
  message = '';
  saving = false;
  readonly statuses: CandidateStatus[] = ['NEEDS_REVIEW', 'NEW', 'REVIEWED', 'INTERVIEW', 'REJECTED', 'HIRED'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.message = 'Candidate ID not found';
      return;
    }

    this.candidateService.getCandidateById(id).subscribe({
      next: (res) => {
        this.candidate = res;
        this.skillsText = res.skills.join(', ');
        this.languagesText = res.languages.join(', ');
        this.educationText = (res.educationEntries || []).join('\n');
        this.experienceText = (res.experienceEntries || []).join('\n');
        this.projectsText = (res.projectEntries || []).join('\n');
        this.certificationsText = (res.certifications || []).join('\n');
        this.setExperienceFields(res.yearsOfExperience);
      },
      error: () => this.message = 'Could not load candidate'
    });
  }

  save(): void {
    if (!this.candidate) return;
    this.saving = true;

    this.candidate.skills = this.skillsText
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    this.candidate.languages = this.languagesText
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    this.candidate.yearsOfExperience = this.totalExperience();
    this.candidate.educationEntries = this.linesToList(this.educationText);
    this.candidate.experienceEntries = this.linesToList(this.experienceText);
    this.candidate.projectEntries = this.linesToList(this.projectsText);
    this.candidate.certifications = this.linesToList(this.certificationsText);
    delete (this.candidate as Partial<CandidateResponse>).alfrescoNodeId;
    delete (this.candidate as Partial<CandidateResponse>).alfrescoFileUrl;

    this.candidateService.updateCandidate(this.candidate.id, this.candidate).subscribe({
      next: () => {
        this.candidateService.updateStatus(this.candidate!.id, this.candidate!.status).subscribe({
          next: () => {
            this.saving = false;
            this.message = 'Candidate updated successfully';
            this.toastService.show('Candidate saved', 'The candidate profile was updated.', 'success');
            setTimeout(() => this.router.navigate(['/candidates']), 700);
          },
          error: (err) => {
            this.saving = false;
            this.message = err?.error?.message || 'Status update failed';
            this.toastService.show('Save failed', this.message, 'error');
          }
        });
      },
      error: (err) => {
        this.saving = false;
        this.message = err?.error?.message || 'Update failed';
        this.toastService.show('Save failed', this.message, 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/candidates']);
  }

  viewCv(): void {
    if (!this.candidate) {
      return;
    }
    this.candidateService.viewCv(this.candidate.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toastService.show('CV view failed', 'Could not open the original CV.', 'error')
    });
  }

  downloadCv(): void {
    if (!this.candidate) {
      return;
    }
    this.candidateService.downloadCv(this.candidate.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.candidate?.cvFileName || 'candidate-cv';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toastService.show('CV download failed', 'Could not download the original CV.', 'error')
    });
  }

  toggleShortlist(): void {
    if (!this.candidate) {
      return;
    }
    this.candidateService.toggleShortlist(this.candidate.id).subscribe({
      next: (updated) => this.candidate = updated,
      error: () => this.toastService.show('Shortlist failed', 'Could not update shortlist state.', 'error')
    });
  }

  initials(name: string | null | undefined): string {
    const parts = (name || 'Candidate').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'CV';
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

  private setExperienceFields(value: number | null | undefined): void {
    const totalMonths = Math.max(0, Math.round((Number(value) || 0) * 12));
    this.experienceYears = Math.floor(totalMonths / 12);
    this.experienceMonths = totalMonths % 12;
  }

  private totalExperience(): number {
    const years = Math.max(0, Number(this.experienceYears) || 0);
    const months = Math.max(0, Math.min(11, Number(this.experienceMonths) || 0));
    return Math.round((years + months / 12) * 100) / 100;
  }

  private linesToList(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(v => v.length > 0);
  }

  hasParsingWarnings(): boolean {
    if (!this.candidate) {
      return false;
    }

    return Boolean(this.candidate.parsingWarnings?.length)
      || this.isMissing(this.candidate.fullName)
      || this.isMissing(this.candidate.email)
      || this.isMissing(this.candidate.currentJobTitle)
      || !this.skillsText.trim();
  }

  isMissing(value: string | null | undefined): boolean {
    return !value || value.trim().toLowerCase() === 'unknown';
  }

  parsingWarningList(): string[] {
    if (!this.candidate) {
      return [];
    }

    const warnings = [...(this.candidate.parsingWarnings || [])];
    if (this.isMissing(this.candidate.fullName) && !warnings.includes('Missing full name')) {
      warnings.push('Missing full name');
    }
    if (this.isMissing(this.candidate.email) && !warnings.includes('Missing email')) {
      warnings.push('Missing email');
    }
    if (this.isMissing(this.candidate.currentJobTitle) && !warnings.includes('Missing current job title')) {
      warnings.push('Missing current job title');
    }
    if (!this.skillsText.trim() && !warnings.includes('Missing skills')) {
      warnings.push('Missing skills');
    }
    return warnings;
  }
}
