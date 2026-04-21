import { Injectable } from '@angular/core';
import keycloak from '../keycloak';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  getToken(): string | undefined {
    return keycloak.token;
  }

  getUsername(): string {
    return keycloak.tokenParsed?.['preferred_username']?.toString() || 'unknown';
  }

  getRoles(): string[] {
    return keycloak.realmAccess?.roles || [];
  }

  logout(): void {
    keycloak.logout({
      redirectUri: 'http://localhost:4200'
    });
  }
}