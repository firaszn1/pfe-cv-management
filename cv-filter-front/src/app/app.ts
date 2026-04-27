import { Component, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import keycloak from './keycloak';
import { AlertService } from './services/alert.service';
import { SmartHrAssistantComponent } from './components/smart-hr-assistant/smart-hr-assistant.component';

type ThemeMode = 'dark' | 'light';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SmartHrAssistantComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private document = inject(DOCUMENT);
  private router = inject(Router);
  readonly alertService = inject(AlertService);

  username = keycloak.tokenParsed?.['preferred_username']?.toString() || 'unknown';
  roles = keycloak.realmAccess?.roles || [];
  theme: ThemeMode = 'dark';
  isAdmin = this.roles.includes('ADMIN');

  get isPublicPage(): boolean {
    return this.router.url.startsWith('/register');
  }

  get isAuthenticated(): boolean {
    return keycloak.authenticated === true;
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('cv-theme') as ThemeMode | null;
    this.theme = savedTheme === 'light' ? 'light' : 'dark';
    this.applyTheme();
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cv-theme', this.theme);
    this.applyTheme();
  }

  applyTheme(): void {
    const host = this.document.documentElement;
    if (this.theme === 'light') {
      host.classList.add('light-theme-root');
    } else {
      host.classList.remove('light-theme-root');
    }
  }

  async logout(): Promise<void> {
    const confirmed = await this.alertService.confirm({
      title: 'Logout',
      message: 'Do you want to end your current session?',
      confirmText: 'Logout',
      kind: 'danger'
    });

    if (!confirmed) {
      return;
    }

    keycloak.logout({
      redirectUri: 'http://localhost:4200'
    });
  }
}
