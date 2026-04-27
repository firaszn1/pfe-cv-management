import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface RegistrationRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  enabled: boolean;
  roles: string[];
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="register-page">
      <section class="register-panel">
        <div class="brand-row">
          <div class="brand-logo">CV</div>
          <div>
            <p class="eyebrow">HR access request</p>
            <h1>Request an HR account</h1>
          </div>
        </div>

        <p class="intro">
          Submit your details and an administrator will approve your account before you can access the platform.
        </p>

        @if (successMessage) {
          <div class="message success">
            <h2>Request sent</h2>
            <p>{{ successMessage }}</p>
          </div>
        } @else {
          <form class="register-form" (ngSubmit)="submit()">
            <div class="form-grid">
              <label>
                <span>Username</span>
                <input name="username" [(ngModel)]="form.username" placeholder="hr.jane" required />
              </label>

              <label>
                <span>Email</span>
                <input name="email" [(ngModel)]="form.email" type="email" placeholder="jane@company.com" required />
              </label>

              <label>
                <span>First name</span>
                <input name="firstName" [(ngModel)]="form.firstName" placeholder="Jane" />
              </label>

              <label>
                <span>Last name</span>
                <input name="lastName" [(ngModel)]="form.lastName" placeholder="Doe" />
              </label>

              <label class="wide">
                <span>Password</span>
                <input name="password" [(ngModel)]="form.password" type="password" placeholder="Choose a secure password" required />
              </label>
            </div>

            @if (errorMessage) {
              <div class="message error">{{ errorMessage }}</div>
            }

            <button class="primary-btn" type="submit" [disabled]="loading">
              {{ loading ? 'Sending request...' : 'Request HR account' }}
            </button>
          </form>
        }

        <div class="footer-row">
          <a routerLink="/dashboard">Already approved? Sign in</a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      color: #e5eefc;
      background:
        linear-gradient(rgba(7, 13, 28, 0.82), rgba(7, 13, 28, 0.9)),
        url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80') center/cover;
    }

    .register-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px 18px;
      box-sizing: border-box;
    }

    .register-panel {
      width: min(680px, 100%);
      padding: 28px;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.86);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(14px);
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      color: #fff;
      font-weight: 900;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
    }

    .eyebrow {
      margin: 0 0 6px;
      color: #93c5fd;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h1,
    h2 {
      margin: 0;
      color: #f8fafc;
    }

    .intro {
      margin: 18px 0 0;
      color: #cbd5e1;
      line-height: 1.6;
    }

    .register-form {
      margin-top: 22px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 800;
    }

    .wide {
      grid-column: span 2;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 13px;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.26);
      background: rgba(15, 23, 42, 0.76);
      color: #f8fafc;
      outline: none;
    }

    input:focus {
      border-color: rgba(34, 211, 238, 0.55);
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
    }

    .primary-btn {
      width: 100%;
      margin-top: 18px;
      padding: 13px 16px;
      border: 0;
      border-radius: 12px;
      color: #fff;
      cursor: pointer;
      font-weight: 900;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
    }

    .primary-btn:disabled {
      cursor: wait;
      opacity: 0.72;
    }

    .message {
      margin-top: 16px;
      padding: 12px 14px;
      border-radius: 12px;
      line-height: 1.5;
    }

    .message.error {
      color: #fecaca;
      background: rgba(239, 68, 68, 0.13);
      border: 1px solid rgba(239, 68, 68, 0.28);
    }

    .message.success {
      color: #bbf7d0;
      background: rgba(34, 197, 94, 0.13);
      border: 1px solid rgba(34, 197, 94, 0.28);
    }

    .message.success p {
      margin: 8px 0 0;
    }

    .footer-row {
      margin-top: 18px;
      text-align: center;
    }

    .footer-row a {
      color: #a5f3fc;
      font-weight: 800;
      text-decoration: none;
    }

    @media (max-width: 640px) {
      .register-panel {
        padding: 22px;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .wide {
        grid-column: span 1;
      }
    }
  `]
})
export class RegisterComponent {
  private http = inject(HttpClient);

  loading = false;
  successMessage = '';
  errorMessage = '';

  form: RegistrationRequest = {
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    enabled: false,
    roles: []
  };

  submit(): void {
    this.errorMessage = '';

    if (!this.form.username.trim() || !this.form.email.trim() || !this.form.password.trim()) {
      this.errorMessage = 'Username, email, and password are required.';
      return;
    }

    const payload: RegistrationRequest = {
      username: this.form.username.trim(),
      email: this.form.email.trim(),
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      password: this.form.password,
      enabled: false,
      roles: []
    };

    this.loading = true;
    this.http.post('http://localhost:8081/api/public/register', payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Your account was created as disabled. An admin can now approve it from Admin Users.';
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(error);
      }
    });
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

    return 'Registration failed. Check the backend and Keycloak admin configuration.';
  }
}
