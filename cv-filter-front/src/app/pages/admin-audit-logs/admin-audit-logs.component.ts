import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import keycloak from '../../keycloak';
import { AdminUserService, AuditLogFilterParams, AuditLogResponse } from '../../services/admin-user.service';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-page">
      <section class="hero-card">
        <div class="hero-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
        </div>
        <div class="hero-body">
          <p class="eyebrow">Admin Panel</p>
          <h2>Audit Trail</h2>
          <p>Review all platform actions: candidate uploads, profile edits, AI queries, and account changes.</p>
        </div>
        <div class="hero-actions">
          <button class="refresh-btn" (click)="loadLogs(currentPage)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <div class="record-count">
            <span>{{ totalElements }}</span>
            <p>records</p>
          </div>
        </div>
      </section>

      @if (!isAdmin) {
        <section class="page-card empty-card">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h3>Access Denied</h3>
          <p>Only ADMIN users can view the audit trail.</p>
        </section>
      } @else {
        <section class="page-card table-card">
          <div class="audit-toolbar">
            <div class="toolbar-filters">
              <div class="search-field">
                <span>Actor</span>
                <input [(ngModel)]="filters.actor" type="search" placeholder="Username or email" />
              </div>
              <div class="search-field">
                <span>Action</span>
                <input [(ngModel)]="filters.action" type="search" placeholder="CV_UPLOADED, CANDIDATE_DELETED…" />
              </div>
              <div class="search-field">
                <span>Target Type</span>
                <input [(ngModel)]="filters.targetType" type="search" placeholder="CANDIDATE · USER · AI" />
              </div>
              <div class="search-field">
                <span>Keyword</span>
                <input [(ngModel)]="filters.keyword" type="search" placeholder="Target, id, details…" />
              </div>
            </div>
            <div class="toolbar-actions">
              <button class="apply-btn" (click)="applyFilters()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Apply
              </button>
              <button class="reset-btn" (click)="resetFilters()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Reset
              </button>
            </div>
          </div>

          @if (loading) {
            <div class="loading-state">
              <div class="loading-spinner">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
              <p>Loading audit logs…</p>
            </div>
          } @else if (logs.length === 0 && !hasActiveFilters()) {
            <div class="empty-inline">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>No audit activity recorded yet.</p>
            </div>
          } @else if (logs.length === 0) {
            <div class="empty-inline">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p>No records match this search.</p>
            </div>
          } @else {
            <div class="audit-list">
              @for (log of logs; track log.id) {
                <article class="audit-row">
                  <div class="action-pill" [attr.data-action-type]="actionType(log.action)">
                    {{ humanAction(log.action) }}
                  </div>
                  <div class="audit-main">
                    <h3>{{ log.targetName || log.targetId || log.targetType }}</h3>
                    <p>{{ log.details || 'No additional details' }}</p>
                    <div class="audit-meta">
                      <span class="meta-badge">{{ log.targetType }}</span>
                      <span class="meta-actor">{{ log.actorUsername }}</span>
                      <span class="meta-role">{{ log.actorRole }}</span>
                    </div>
                  </div>
                  <time>{{ formatDate(log.timestamp) }}</time>
                </article>
              }
            </div>

            @if (totalPages > 1) {
              <nav class="pagination-row" aria-label="Audit log pagination">
                <button class="nav-btn" (click)="previousPage()" [disabled]="currentPage === 0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>
                @for (page of visiblePages(); track page) {
                  <button
                    class="page-btn"
                    [class.active]="page === currentPage"
                    [disabled]="page === currentPage"
                    (click)="loadLogs(page)">
                    {{ page + 1 }}
                  </button>
                }
                <button class="nav-btn" (click)="nextPage()" [disabled]="currentPage >= totalPages - 1">
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </nav>
            }
          }
        </section>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --surface:   rgba(255,255,255,0.046);
      --surface-2: rgba(255,255,255,0.032);
      --surface-3: rgba(255,255,255,0.068);
      --border:    rgba(255,255,255,0.08);
      --text:      #e2eaf6;
      --heading:   #f0f6ff;
      --muted:     #8a9ab5;
      --accent-1:  #6366f1;
      --accent-2:  #06b6d4;
      --shadow:    0 8px 32px rgba(0,0,0,0.24);
    }

    :host-context(.light-theme-root) {
      --surface:   rgba(255,255,255,0.88);
      --surface-2: rgba(255,255,255,0.76);
      --surface-3: rgba(15,23,42,0.04);
      --border:    rgba(15,23,42,0.08);
      --text:      #1e293b;
      --heading:   #0f172a;
      --muted:     #64748b;
      --shadow:    0 8px 32px rgba(15,23,42,0.10);
    }

    /* ── PAGE ───────────────────────────────────────────── */
    .audit-page {
      display: flex;
      flex-direction: column;
      gap: 22px;
      color: var(--text);
      animation: fadeInUp 0.3s ease both;
    }

    /* ── HERO CARD ──────────────────────────────────────── */
    .hero-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 28px 32px;
      border-radius: 24px;
      background:
        linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(6,182,212,0.08) 100%),
        var(--surface);
      border: 1px solid rgba(99,102,241,0.18);
      box-shadow: var(--shadow);
      backdrop-filter: blur(20px);
      flex-wrap: wrap;
    }

    .hero-icon {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      box-shadow: 0 8px 24px rgba(99,102,241,0.32);
      flex-shrink: 0;
    }

    .hero-body { flex: 1; min-width: 200px; }

    .eyebrow {
      margin: 0 0 6px;
      color: var(--accent-2);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    :host-context(.light-theme-root) .eyebrow { color: var(--accent-1); }

    .hero-body h2 {
      margin: 0 0 8px;
      font-size: 26px;
      font-weight: 800;
      color: var(--heading);
      letter-spacing: -0.02em;
    }

    .hero-body p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 11px 16px;
      cursor: pointer;
      color: var(--text);
      background: var(--surface-3);
      font-weight: 700;
      font-size: 13.5px;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover {
      transform: translateY(-1px);
      border-color: rgba(99,102,241,0.24);
      box-shadow: 0 8px 18px rgba(99,102,241,0.10);
    }

    .record-count {
      text-align: center;
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      min-width: 72px;
    }

    .record-count span {
      display: block;
      font-size: 22px;
      font-weight: 800;
      color: var(--heading);
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .record-count p {
      margin: 3px 0 0;
      font-size: 11px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    /* ── PAGE CARD ──────────────────────────────────────── */
    .page-card {
      padding: 26px;
      border-radius: 22px;
      background: linear-gradient(145deg, var(--surface), var(--surface-2));
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    :host-context(.light-theme-root) .page-card {
      background: rgba(255,255,255,0.88);
      border-color: rgba(15,23,42,0.08);
    }

    /* ── EMPTY CARD ─────────────────────────────────────── */
    .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 28px;
      text-align: center;
    }

    .empty-icon {
      width: 68px;
      height: 68px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.12);
      color: var(--muted);
    }

    .empty-card h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--heading);
    }

    .empty-card p { margin: 0; color: var(--muted); font-size: 14px; }

    /* ── AUDIT TOOLBAR ──────────────────────────────────── */
    .audit-toolbar {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      margin-bottom: 22px;
      flex-wrap: wrap;
      padding: 20px;
      border-radius: 18px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    .toolbar-filters {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      flex: 1;
      min-width: 0;
    }

    .search-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .search-field span {
      color: var(--muted);
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .search-field input {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      color: var(--text);
      background: var(--surface-3);
      outline: none;
      font-size: 13.5px;
      transition: border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .search-field input:focus {
      border-color: rgba(99,102,241,0.36);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }

    .toolbar-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .apply-btn, .reset-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border-radius: 12px;
      padding: 11px 16px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .apply-btn {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      border: none;
      box-shadow: 0 6px 18px rgba(99,102,241,0.24);
    }

    .apply-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(99,102,241,0.32); }

    .reset-btn {
      color: var(--muted);
      background: transparent;
      border: 1px solid var(--border);
    }

    .reset-btn:hover { color: var(--heading); border-color: rgba(99,102,241,0.22); }

    /* ── LOADING / EMPTY INLINE ─────────────────────────── */
    .loading-state, .empty-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 28px 16px;
      color: var(--muted);
      font-size: 14px;
    }

    .loading-spinner {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(99,102,241,0.10);
      color: var(--accent-1);
    }

    .spin { animation: spinAnim 1s linear infinite; }

    @keyframes spinAnim { to { transform: rotate(360deg); } }

    /* ── AUDIT LIST ─────────────────────────────────────── */
    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .audit-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 18px;
      border-radius: 16px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .audit-row:hover {
      transform: translateY(-2px);
      border-color: rgba(99,102,241,0.20);
      box-shadow: 0 14px 32px rgba(0,0,0,0.18);
    }

    /* ── ACTION PILL ────────────────────────────────────── */
    .action-pill {
      flex-shrink: 0;
      width: 148px;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 11.5px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.02em;
      border: 1px solid transparent;
      background: rgba(99,102,241,0.12);
      color: #a5b4fc;
      border-color: rgba(99,102,241,0.18);
    }

    .action-pill[data-action-type="success"] {
      background: rgba(34,197,94,0.12);
      color: #4ade80;
      border-color: rgba(34,197,94,0.20);
    }

    .action-pill[data-action-type="danger"] {
      background: rgba(239,68,68,0.12);
      color: #f87171;
      border-color: rgba(239,68,68,0.20);
    }

    .action-pill[data-action-type="info"] {
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
      border-color: rgba(59,130,246,0.20);
    }

    .action-pill[data-action-type="accent"] {
      background: rgba(168,85,247,0.12);
      color: #d8b4fe;
      border-color: rgba(168,85,247,0.20);
    }

    /* ── AUDIT MAIN ─────────────────────────────────────── */
    .audit-main {
      flex: 1;
      min-width: 0;
    }

    .audit-main h3 {
      margin: 0 0 5px;
      font-size: 14.5px;
      font-weight: 700;
      color: var(--heading);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .audit-main p {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .audit-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .meta-badge {
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(99,102,241,0.10);
      border: 1px solid rgba(99,102,241,0.16);
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 700;
    }

    :host-context(.light-theme-root) .meta-badge { color: var(--accent-1); }

    .meta-actor {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text);
    }

    .meta-role {
      font-size: 12px;
      color: var(--muted);
    }

    time {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── PAGINATION ─────────────────────────────────────── */
    .pagination-row {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 18px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 14px;
      cursor: pointer;
      color: var(--text);
      background: var(--surface-3);
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .nav-btn:hover:not(:disabled) { border-color: rgba(99,102,241,0.24); }
    .nav-btn:disabled { opacity: 0.44; cursor: not-allowed; }

    .page-btn {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      color: var(--muted);
      background: transparent;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .page-btn:hover:not(:disabled) { border-color: rgba(99,102,241,0.24); color: var(--heading); }

    .page-btn.active {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      border-color: transparent;
      box-shadow: 0 6px 16px rgba(99,102,241,0.28);
    }

    /* ── ANIMATION ──────────────────────────────────────── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── RESPONSIVE ─────────────────────────────────────── */
    @media (max-width: 900px) {
      .toolbar-filters { grid-template-columns: 1fr; }
      .toolbar-actions { flex-direction: row; }
    }

    @media (max-width: 700px) {
      .hero-card  { flex-direction: column; padding: 22px; }
      .audit-row  { flex-direction: column; align-items: flex-start; }
      .action-pill { width: auto; }
    }
  `]
})
export class AdminAuditLogsComponent {
  private adminUserService = inject(AdminUserService);

  readonly isAdmin = (keycloak.realmAccess?.roles || []).includes('ADMIN');
  logs: AuditLogResponse[] = [];
  loading = false;
  pageSize = 20;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  filters: AuditLogFilterParams = {
    actor: '',
    action: '',
    targetType: '',
    keyword: ''
  };

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadLogs(0);
    }
  }

  loadLogs(page = this.currentPage): void {
    this.loading = true;
    this.adminUserService.getAuditLogs({
      ...this.filters,
      page: Math.max(0, page),
      size: this.pageSize
    }).subscribe({
      next: (response) => {
        this.logs = response.content || [];
        this.currentPage = response.currentPage ?? 0;
        this.totalPages = response.totalPages ?? 0;
        this.totalElements = response.totalElements ?? 0;
        this.loading = false;
      },
      error: () => {
        this.logs = [];
        this.currentPage = 0;
        this.totalPages = 0;
        this.totalElements = 0;
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadLogs(0);
  }

  resetFilters(): void {
    this.filters = {
      actor: '',
      action: '',
      targetType: '',
      keyword: ''
    };
    this.loadLogs(0);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadLogs(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadLogs(this.currentPage - 1);
    }
  }

  visiblePages(): number[] {
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 5);
    return Array.from({ length: end - start }, (_, index) => start + index);
  }

  hasActiveFilters(): boolean {
    return Boolean(
      this.filters.actor?.trim() ||
      this.filters.action?.trim() ||
      this.filters.targetType?.trim() ||
      this.filters.keyword?.trim()
    );
  }

  humanAction(action: string): string {
    return (action || '')
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleString() : '';
  }

  actionType(action: string): string {
    const a = (action || '').toUpperCase();
    if (a.includes('DELETE') || a.includes('REJECT')) return 'danger';
    if (a.includes('CREATE') || a.includes('UPLOAD') || a.includes('ADD') || a.includes('APPROV')) return 'success';
    if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('CHANGE') || a.includes('STATUS')) return 'info';
    if (a.includes('AI') || a.includes('MATCH') || a.includes('SEARCH') || a.includes('EXPORT')) return 'accent';
    return 'default';
  }

}
