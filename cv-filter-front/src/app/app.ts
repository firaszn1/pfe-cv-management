import { Component, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import keycloak from './keycloak';

type ThemeMode = 'dark' | 'light';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private document = inject(DOCUMENT);

  username = keycloak.tokenParsed?.['preferred_username']?.toString() || 'unknown';
  roles = keycloak.realmAccess?.roles || [];
  theme: ThemeMode = 'dark';

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

  logout(): void {
    keycloak.logout({
      redirectUri: 'http://localhost:4200'
    });
  }
}