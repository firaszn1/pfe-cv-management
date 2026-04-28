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
      <section class="page-card hero-card">
        <div>
          <p class="eyebrow">Audit Trail</p>
          <h2>Platform activity</h2>
          <p>Review sensitive ATS actions across candidates, documents, and HR account management.</p>
        </div>
        <button class="secondary-btn" (click)="loadLogs(currentPage)">Refresh</button>
      </section>

      @if (!isAdmin) {
        <section class="page-card empty-card">
          <h3>Access denied</h3>
          <p>Only ADMIN users can view audit logs.</p>
        </section>
      } @else {
        <section class="page-card table-card">
          <div class="audit-toolbar">
            <div class="search-field">
              <span>Actor</span>
              <input
                [(ngModel)]="filters.actor"
                type="search"
                placeholder="Username or email" />
            </div>
            <div class="search-field">
              <span>Action</span>
              <input [(ngModel)]="filters.action" type="search" placeholder="CV_UPLOADED" />
            </div>
            <div class="search-field">
              <span>Target type</span>
              <input [(ngModel)]="filters.targetType" type="search" placeholder="CANDIDATE / USER / AI" />
            </div>
            <div class="search-field">
              <span>Keyword</span>
              <input [(ngModel)]="filters.keyword" type="search" placeholder="Target, id, details..." />
            </div>
            <div class="toolbar-actions">
              <button class="secondary-btn" (click)="applyFilters()">Apply</button>
              <button class="secondary-btn" (click)="resetFilters()">Reset</button>
            </div>
            <div class="result-count">
              {{ totalElements }} records
            </div>
          </div>

          @if (loading) {
            <p class="muted">Loading audit logs...</p>
          } @else if (logs.length === 0 && !hasActiveFilters()) {
            <p class="muted">No audit activity recorded yet.</p>
          } @else if (logs.length === 0) {
            <p class="muted">No audit history matches this search.</p>
          } @else {
            <div class="audit-list">
              @for (log of logs; track log.id) {
                <article class="audit-row">
                  <div class="action-pill">{{ humanAction(log.action) }}</div>
                  <div class="audit-main">
                    <h3>{{ log.targetName || log.targetId || log.targetType }}</h3>
                    <p>{{ log.details || 'No additional details' }}</p>
                    <span>{{ log.targetType }} · {{ log.actorUsername }} ({{ log.actorRole }})</span>
                  </div>
                  <time>{{ formatDate(log.timestamp) }}</time>
                </article>
              }
            </div>

            @if (totalPages > 1) {
              <nav class="pagination-row" aria-label="Audit log pagination">
                <button class="secondary-btn" (click)="previousPage()" [disabled]="currentPage === 0">Previous</button>
                @for (page of visiblePages(); track page) {
                  <button
                    [ngClass]="page === currentPage ? 'secondary-btn active-page' : 'secondary-btn'"
                    [disabled]="page === currentPage"
                    (click)="loadLogs(page)">
                    {{ page + 1 }}
                  </button>
                }
                <button class="secondary-btn" (click)="nextPage()" [disabled]="currentPage >= totalPages - 1">Next</button>
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
      color: var(--text);
    }

    .audit-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .page-card {
      padding: 20px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: var(--shadow);
    }

    :host-context(.light-theme-root) .page-card {
      background: rgba(255, 255, 255, 0.78);
      border-color: rgba(15, 23, 42, 0.08);
    }

    .hero-card,
    .audit-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #93c5fd;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h2,
    h3 {
      margin: 0;
      color: var(--heading);
    }

    .hero-card p:last-child,
    .muted,
    .audit-main p,
    .audit-main span,
    time {
      color: var(--muted);
    }

    .secondary-btn {
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 11px 15px;
      cursor: pointer;
      color: var(--text);
      background: rgba(255,255,255,0.08);
      font-weight: 800;
    }

    .audit-toolbar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .toolbar-actions,
    .pagination-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 1;
      min-width: min(100%, 320px);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .search-field span,
    .result-count {
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .search-field input {
      width: 100%;
      box-sizing: border-box;
      padding: 13px 15px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      color: var(--text);
      background: rgba(255,255,255,0.05);
      outline: none;
      transition: 0.2s ease;
    }

    .secondary-btn.active-page {
      color: #fff;
      background: rgba(6,182,212,0.28);
      border-color: rgba(6,182,212,0.44);
    }

    .search-field input:focus {
      border-color: rgba(6,182,212,0.38);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.10);
    }

    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .audit-row {
      padding: 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
    }

    .audit-row:hover {
      transform: translateY(-2px);
      border-color: rgba(6,182,212,0.24);
      box-shadow: 0 16px 34px rgba(6,182,212,0.08);
    }

    .audit-main {
      flex: 1;
      min-width: 0;
    }

    .audit-main p {
      margin: 6px 0;
    }

    .action-pill {
      width: 170px;
      padding: 9px 12px;
      border-radius: 999px;
      color: #c7d2fe;
      background: rgba(79,70,229,0.16);
      font-size: 12px;
      font-weight: 900;
      text-align: center;
    }

    time {
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }

    @media (max-width: 760px) {
      .hero-card,
      .audit-row {
        align-items: flex-start;
        flex-direction: column;
      }

      .action-pill {
        width: auto;
      }
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

}
