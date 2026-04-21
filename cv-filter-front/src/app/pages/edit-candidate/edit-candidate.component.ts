import { Component, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateService, CandidateResponse } from '../../services/candidate.service';

@Component({
  selector: 'app-edit-candidate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-page">
      <div class="header-card">
        <p class="eyebrow">Candidate Editor</p>
        <h2>Edit candidate profile</h2>
        <p>Review and correct extracted information before using it in filtering or smart search.</p>
      </div>

      @if (candidate) {
        <div class="form-card">
          <div class="form-grid">
            <div class="field">
              <label>Name</label>
              <input [(ngModel)]="candidate.fullName" />
            </div>

            <div class="field">
              <label>Email</label>
              <input [(ngModel)]="candidate.email" />
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
              <input [(ngModel)]="candidate.currentJobTitle" />
            </div>

            <div class="field">
              <label>Degree</label>
              <input [(ngModel)]="candidate.highestDegree" />
            </div>

            <div class="field">
              <label>Experience</label>
              <input type="number" step="0.1" [(ngModel)]="candidate.yearsOfExperience" />
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
              <label>Skills (comma separated)</label>
              <input [(ngModel)]="skillsText" />
            </div>

            <div class="field field-wide">
              <label>Languages (comma separated)</label>
              <input [(ngModel)]="languagesText" />
            </div>
          </div>

          <div class="action-row">
            <button class="primary-btn" (click)="save()">✓ Save Changes</button>
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

    .header-card,
    .form-card {
      padding: 24px;
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
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

    .header-card h2 {
      margin: 0 0 8px;
      font-size: 30px;
      color: var(--heading);
    }

    .header-card p:last-child {
      margin: 0;
      color: var(--muted);
      line-height: 1.7;
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
    .field select {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      outline: none;
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
    .secondary-btn {
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
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
    }

    .primary-btn:hover,
    .secondary-btn:hover {
      transform: translateY(-1px);
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
    }
  `]
})
export class EditCandidateComponent {
  @HostBinding('class.edit-host') hostClass = true;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private candidateService = inject(CandidateService);

  candidate: CandidateResponse | null = null;
  skillsText = '';
  languagesText = '';
  message = '';

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
      },
      error: () => this.message = 'Could not load candidate'
    });
  }

  save(): void {
    if (!this.candidate) return;

    this.candidate.skills = this.skillsText
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    this.candidate.languages = this.languagesText
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    this.candidateService.updateCandidate(this.candidate.id, this.candidate).subscribe({
      next: () => {
        this.message = 'Candidate updated successfully';
        setTimeout(() => this.router.navigate(['/candidates']), 700);
      },
      error: (err) => this.message = err?.error?.message || 'Update failed'
    });
  }

  goBack(): void {
    this.router.navigate(['/candidates']);
  }
}