import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'cv-realm',
  clientId: 'cv-frontend'
});

export default keycloak;