import { CanActivateFn } from '@angular/router';
import keycloak from '../keycloak';

export const authGuard: CanActivateFn = () => {
  if (keycloak.authenticated) {
    return true;
  }

  keycloak.login({
    redirectUri: window.location.origin + window.location.pathname
  });

  return false;
};
