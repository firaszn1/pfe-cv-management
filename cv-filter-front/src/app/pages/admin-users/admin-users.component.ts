import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import keycloak from '../../keycloak';
import {
  AdminUserRequest,
  AdminUserResponse,
  AdminUserService
} from '../../services/admin-user.service';
import { AlertService } from '../../services/alert.service';
import { ToastService } from '../../services/toast.service';

type ManagedRole = 'HR';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-users-page">
      <div class="page-card hero-card">
        <div>
          <p class="eyebrow">Admin Security</p>
          <h2>Manage HR and admin accounts</h2>
          <p class="hero-copy">
            These accounts are stored in Keycloak. MongoDB remains dedicated to candidates and CV data.
          </p>
        </div>

        <button class="secondary-btn" (click)="refreshAll()">Refresh</button>
      </div>

      @if (!isAdmin) {
        <div class="page-card empty-card">
          <h3>Access denied</h3>
          <p>Only users with the ADMIN realm role can manage accounts.</p>
        </div>
      } @else {
        <section class="page-card pending-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Approval queue</p>
              <h3>Pending HR registration requests</h3>
            </div>
            <span class="count-pill">{{ pendingUsers.length }} pending</span>
          </div>

          @if (pendingLoading) {
            <div class="empty-card compact">
              <p>Loading requests...</p>
            </div>
          } @else if (pendingUsers.length === 0) {
            <div class="empty-card compact">
              <p>No pending HR account requests.</p>
            </div>
          } @else {
            <div class="pending-list">
              @for (user of pendingUsers; track user.id) {
                <article class="user-row pending-row">
                  <div class="user-main">
                    <div class="identity">
                      <h4>{{ displayName(user) }}</h4>
                      <p>{{ user.username }} â€¢ {{ user.email }}</p>
                    </div>

                    <div class="meta">
                      <span class="status-pill off">Pending approval</span>
                    </div>
                  </div>

                  <div class="user-actions">
                    <button class="primary-btn small" (click)="approveUser(user)">Approve HR</button>
                    <button class="danger-btn small" (click)="rejectUser(user)">Reject</button>
                  </div>
                </article>
              }
            </div>
          }
        </section>

        <div class="layout-grid">
          <section class="page-card form-card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Editor</p>
                <h3>{{ selectedUserId ? 'Edit user' : 'Create user' }}</h3>
              </div>

              @if (selectedUserId) {
                <button class="ghost-btn" (click)="resetForm()">New user</button>
              }
            </div>

            <div class="form-grid">
              <div class="field">
                <label>Username</label>
                <input [(ngModel)]="form.username" placeholder="hr.jane" />
              </div>

              <div class="field">
                <label>Email</label>
                <input [(ngModel)]="form.email" type="email" placeholder="jane@company.com" />
              </div>

              <div class="field">
                <label>First name</label>
                <input [(ngModel)]="form.firstName" placeholder="Jane" />
              </div>

              <div class="field">
                <label>Last name</label>
                <input [(ngModel)]="form.lastName" placeholder="Doe" />
              </div>

              <div class="field field-wide">
                <label>{{ selectedUserId ? 'New password (optional)' : 'Password' }}</label>
                <input [(ngModel)]="form.password" type="password" placeholder="Secure password" />
              </div>

              <div class="field field-wide switch-field">
                <label>
                  <input [(ngModel)]="form.enabled" type="checkbox" />
                  <span>User enabled</span>
                </label>
              </div>
            </div>

            <div class="roles-box">
              <p>App-managed realm roles</p>
              <div class="role-options">
                @for (role of availableRoles; track role) {
                  <label class="role-chip">
                    <input
                      type="checkbox"
                      [checked]="hasRole(role)"
                      (change)="toggleRole(role)" />
                    <span>{{ role }}</span>
                  </label>
                }
              </div>
            </div>

            @if (errorMessage) {
              <div class="message error">{{ errorMessage }}</div>
            }

            @if (successMessage) {
              <div class="message success">{{ successMessage }}</div>
            }

            <div class="action-row">
              <button class="primary-btn" (click)="saveUser()">
                {{ selectedUserId ? 'Save changes' : 'Create user' }}
              </button>
              <button class="secondary-btn" (click)="resetForm()">Clear</button>
            </div>
          </section>

          <section class="page-card table-card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Directory</p>
                <h3>Managed users</h3>
              </div>
              <span class="count-pill">{{ filteredUsers.length }} / {{ users.length }} users</span>
            </div>

            <div class="search-bar">
              <input
                [(ngModel)]="userSearch"
                type="search"
                placeholder="Search users" />
            </div>

            @if (loading) {
              <div class="empty-card compact">
                <p>Loading users...</p>
              </div>
            } @else if (users.length === 0) {
              <div class="empty-card compact">
                <h3>No managed users found</h3>
                <p>Create an HR account to get started.</p>
              </div>
            } @else if (filteredUsers.length === 0) {
              <div class="empty-card compact">
                <h3>No matching users</h3>
                <p>Try another username, email, name, or role.</p>
              </div>
            } @else {
              <div class="users-list">
                @for (user of filteredUsers; track user.id) {
                  <article class="user-row" [class.selected]="user.id === selectedUserId">
                    <div class="user-main">
                      <div class="identity">
                        <h4>{{ displayName(user) }}</h4>
                        <p>{{ user.username }} • {{ user.email }}</p>
                      </div>

                      <div class="meta">
                        <span class="status-pill" [class.off]="user.enabled === false">
                          {{ user.enabled === false ? 'Disabled' : 'Enabled' }}
                        </span>
                        <div class="role-list">
                          @for (role of user.roles; track role) {
                            <span class="role-badge">{{ role }}</span>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="user-actions">
                      @if (isAdminUser(user)) {
                        <span class="read-only-note">Keycloak console only</span>
                      } @else {
                        <button class="secondary-btn small" (click)="editUser(user.id)">Edit</button>
                        <button class="danger-btn small" (click)="deleteUser(user)">Delete</button>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: calc(100vh - 178px);
      color: var(--text);
      overflow: hidden;
    }

    .admin-users-page {
      display: flex;
      flex-direction: column;
      gap: 14px;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .page-card {
      padding: 18px;
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
    .card-head,
    .user-main,
    .user-actions,
    .action-row,
    .role-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hero-card {
      flex: 0 0 auto;
      padding: 16px 18px;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
      gap: 16px;
      align-items: stretch;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    .form-card {
      overflow-y: auto;
      min-height: 0;
    }

    .table-card {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .pending-card {
      flex: 0 0 auto;
    }

    .pending-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 220px;
      margin-top: 12px;
      padding-right: 8px;
      overflow-y: auto;
    }

    .pending-row {
      background: rgba(251, 191, 36, 0.08);
      border-color: rgba(251, 191, 36, 0.2);
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

    h2,
    h3,
    h4 {
      margin: 0;
      color: var(--heading);
    }

    .hero-copy,
    .identity p,
    .empty-card p {
      margin: 6px 0 0;
      color: var(--muted);
      line-height: 1.5;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-wide {
      grid-column: span 2;
    }

    .field label,
    .roles-box p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }

    .field input {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 13px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      outline: none;
    }

    :host-context(.light-theme-root) .field input {
      border-color: rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.72);
    }

    .switch-field label,
    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      color: var(--text);
    }

    .roles-box {
      margin-top: 14px;
      padding: 13px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    :host-context(.light-theme-root) .roles-box {
      background: rgba(255, 255, 255, 0.68);
      border-color: rgba(15, 23, 42, 0.08);
    }

    .role-options {
      justify-content: flex-start;
      margin-top: 10px;
    }

    .role-chip {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(79, 70, 229, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.24);
    }

    .message {
      margin-top: 14px;
      padding: 10px 12px;
      border-radius: 12px;
      font-weight: 600;
    }

    .message.error {
      background: rgba(239, 68, 68, 0.12);
      color: #fecaca;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .message.success {
      background: rgba(34, 197, 94, 0.12);
      color: #bbf7d0;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    :host-context(.light-theme-root) .message.error {
      color: #b91c1c;
    }

    :host-context(.light-theme-root) .message.success {
      color: #166534;
    }

    .primary-btn,
    .secondary-btn,
    .danger-btn,
    .ghost-btn {
      border: none;
      cursor: pointer;
      border-radius: 12px;
      padding: 11px 15px;
      font-weight: 800;
      transition: 0.2s ease;
    }

    .primary-btn {
      color: white;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
    }

    .secondary-btn {
      color: var(--text);
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .ghost-btn {
      color: var(--heading);
      background: transparent;
      border: 1px dashed rgba(148, 163, 184, 0.45);
    }

    .danger-btn {
      color: white;
      background: linear-gradient(135deg, var(--danger-1), var(--danger-2));
    }

    .small {
      padding: 8px 12px;
      font-size: 13px;
    }

    .count-pill,
    .status-pill,
    .role-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-weight: 700;
    }

    .count-pill {
      padding: 9px 14px;
      background: rgba(79, 70, 229, 0.14);
      color: #c7d2fe;
    }

    :host-context(.light-theme-root) .count-pill {
      color: #4338ca;
    }

    .search-bar {
      margin-top: 12px;
    }

    .search-bar input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 13px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      outline: none;
    }

    .search-bar input::placeholder {
      color: var(--muted);
    }

    .search-bar input:focus {
      border-color: rgba(34, 211, 238, 0.36);
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
    }

    :host-context(.light-theme-root) .search-bar input {
      border-color: rgba(15, 23, 42, 0.08);
      background: rgba(255, 255, 255, 0.72);
    }

    .users-list {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      gap: 14px;
      margin-top: 14px;
      padding-right: 8px;
      overflow-y: auto;
      min-height: 0;
    }

    .users-list::-webkit-scrollbar {
      width: 8px;
    }

    .users-list::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 999px;
    }

    .users-list::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.45);
      border-radius: 999px;
    }

    .user-row {
      padding: 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .user-row.selected {
      border-color: rgba(34, 211, 238, 0.35);
      box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.18) inset;
    }

    :host-context(.light-theme-root) .user-row {
      background: rgba(255, 255, 255, 0.72);
      border-color: rgba(15, 23, 42, 0.08);
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .status-pill {
      padding: 7px 10px;
      background: rgba(34, 197, 94, 0.12);
      color: #bbf7d0;
    }

    .status-pill.off {
      background: rgba(239, 68, 68, 0.12);
      color: #fecaca;
    }

    :host-context(.light-theme-root) .status-pill {
      color: #166534;
    }

    :host-context(.light-theme-root) .status-pill.off {
      color: #b91c1c;
    }

    .role-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .role-badge {
      padding: 7px 10px;
      background: rgba(6, 182, 212, 0.12);
      color: #a5f3fc;
    }

    .read-only-note {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    :host-context(.light-theme-root) .role-badge {
      color: #0f766e;
    }

    .compact {
      padding: 16px;
      margin-top: 14px;
    }

    .empty-card h3 {
      margin: 0 0 8px;
    }

    @media (max-width: 1100px) {
      :host {
        height: auto;
        overflow: visible;
      }

      .admin-users-page,
      .layout-grid {
        overflow: visible;
      }

      .layout-grid {
        grid-template-columns: 1fr;
      }

      .table-card {
        height: 560px;
      }
    }

    @media (max-width: 720px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .field-wide {
        grid-column: span 1;
      }

      .user-main,
      .user-actions {
        align-items: flex-start;
      }
    }
  `]
})
export class AdminUsersComponent {
  private adminUserService = inject(AdminUserService);
  private alertService = inject(AlertService);
  private toastService = inject(ToastService);

  users: AdminUserResponse[] = [];
  pendingUsers: AdminUserResponse[] = [];
  loading = false;
  pendingLoading = false;
  selectedUserId: string | null = null;
  successMessage = '';
  errorMessage = '';
  userSearch = '';

  readonly availableRoles: ManagedRole[] = ['HR'];
  readonly isAdmin = (keycloak.realmAccess?.roles || []).includes('ADMIN');
  readonly currentUserId = keycloak.subject || '';

  form: AdminUserRequest = this.createEmptyForm();

  ngOnInit(): void {
    if (this.isAdmin) {
      this.refreshAll();
    }
  }

  refreshAll(): void {
    this.loadUsers();
    this.loadPendingUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.clearMessages();

    this.adminUserService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (error) => {
        this.users = [];
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(error);
      }
    });
  }

  loadPendingUsers(): void {
    this.pendingLoading = true;

    this.adminUserService.getPendingUsers().subscribe({
      next: (users) => {
        this.pendingUsers = users;
        this.pendingLoading = false;
      },
      error: (error) => {
        this.pendingUsers = [];
        this.pendingLoading = false;
        this.errorMessage = this.extractErrorMessage(error);
      }
    });
  }

  editUser(id: string): void {
    this.clearMessages();

    this.adminUserService.getUserById(id).subscribe({
      next: (user) => {
        if (this.isAdminUser(user)) {
          this.errorMessage = 'ADMIN users are read-only in the app. Manage ADMIN accounts in Keycloak.';
          return;
        }
        this.selectedUserId = user.id;
        this.form = {
          username: user.username ?? '',
          email: user.email ?? '',
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          password: '',
          enabled: user.enabled !== false,
          roles: [...user.roles]
            .filter((role): role is ManagedRole => role === 'HR')
        };
      },
      error: (error) => this.errorMessage = this.extractErrorMessage(error)
    });
  }

  async saveUser(): Promise<void> {
    this.clearMessages();

    if (!this.form.username.trim() || !this.form.email.trim()) {
      this.errorMessage = 'Username and email are required.';
      return;
    }

    if (!this.selectedUserId && !this.form.password?.trim()) {
      this.errorMessage = 'Password is required when creating a user.';
      return;
    }

    const payload: AdminUserRequest = {
      username: this.form.username.trim(),
      email: this.form.email.trim(),
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      password: this.form.password?.trim() || undefined,
      enabled: this.form.enabled,
      roles: [...this.form.roles]
    };

    if (this.selectedUserId && payload.enabled === false) {
      const confirmed = await this.alertService.confirm({
        title: 'Disable account',
        message: 'Disable this HR account? The user will no longer be able to access the platform.',
        confirmText: 'Disable',
        kind: 'danger'
      });

      if (!confirmed) {
        return;
      }
    }

    const request$ = this.selectedUserId
      ? this.adminUserService.updateUser(this.selectedUserId, payload)
      : this.adminUserService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.selectedUserId
          ? 'User updated successfully.'
          : 'User created successfully.';
        this.toastService.show('User saved', this.successMessage, 'success');
        this.resetForm();
        this.loadUsers();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error);
        this.toastService.show('User save failed', this.errorMessage, 'error');
      }
    });
  }

  async deleteUser(user: AdminUserResponse): Promise<void> {
    this.clearMessages();

    if (this.isAdminUser(user) || user.id === this.currentUserId) {
      this.errorMessage = 'ADMIN users and your own account cannot be deleted from the app.';
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'Delete user',
      message: `Delete ${user.username} from Keycloak? This cannot be undone.`,
      confirmText: 'Delete',
      kind: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.adminUserService.deleteUser(user.id).subscribe({
      next: () => {
        this.successMessage = `User ${user.username} deleted.`;
        this.toastService.show('User deleted', this.successMessage, 'success');
        if (this.selectedUserId === user.id) {
          this.resetForm();
        }
        this.loadUsers();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error);
        this.alertService.alert({
          title: 'Delete failed',
          message: this.errorMessage,
          kind: 'danger'
        });
      }
    });
  }

  async approveUser(user: AdminUserResponse): Promise<void> {
    this.clearMessages();

    const confirmed = await this.alertService.confirm({
      title: 'Approve HR account',
      message: `Approve ${user.username} and assign the HR role?`,
      confirmText: 'Approve',
      kind: 'info'
    });

    if (!confirmed) {
      return;
    }

    this.adminUserService.approveUser(user.id).subscribe({
      next: () => {
        this.successMessage = `${user.username} approved as HR.`;
        this.toastService.show('HR approved', this.successMessage, 'success');
        this.loadPendingUsers();
        this.loadUsers();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error);
        this.alertService.alert({
          title: 'Approval failed',
          message: this.errorMessage,
          kind: 'danger'
        });
      }
    });
  }

  async rejectUser(user: AdminUserResponse): Promise<void> {
    this.clearMessages();

    const confirmed = await this.alertService.confirm({
      title: 'Reject request',
      message: `Reject and delete the account request for ${user.username}?`,
      confirmText: 'Reject',
      kind: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.adminUserService.rejectUser(user.id).subscribe({
      next: () => {
        this.successMessage = `${user.username} request rejected.`;
        this.toastService.show('Request rejected', this.successMessage, 'success');
        this.loadPendingUsers();
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error);
        this.alertService.alert({
          title: 'Reject failed',
          message: this.errorMessage,
          kind: 'danger'
        });
      }
    });
  }

  resetForm(): void {
    this.selectedUserId = null;
    this.form = this.createEmptyForm();
  }

  toggleRole(role: ManagedRole): void {
    if (this.hasRole(role)) {
      this.form.roles = this.form.roles.filter((item) => item !== role);
      return;
    }

    this.form.roles = [...this.form.roles, role];
  }

  hasRole(role: ManagedRole): boolean {
    return this.form.roles.includes(role);
  }

  get filteredUsers(): AdminUserResponse[] {
    const term = this.userSearch.trim().toLowerCase();
    if (!term) {
      return this.users;
    }

    return this.users.filter((user) => {
      const searchable = [
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        ...user.roles
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  displayName(user: AdminUserResponse): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.username;
  }

  isAdminUser(user: AdminUserResponse): boolean {
    return user.roles.includes('ADMIN');
  }

  private createEmptyForm(): AdminUserRequest {
    return {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      enabled: true,
      roles: ['HR']
    };
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as { error?: { message?: string } | string };
      if (typeof httpError.error === 'string' && httpError.error.trim()) {
        return httpError.error;
      }
      if (typeof httpError.error === 'object' && httpError.error?.message) {
        return httpError.error.message;
      }
    }

    return 'The request failed. Check the backend and Keycloak admin client configuration.';
  }
}
