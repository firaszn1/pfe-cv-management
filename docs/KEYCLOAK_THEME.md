# Keycloak Login Theme

This repo includes a custom login theme at:

`keycloak/themes/cv-smartmatch`

It replaces the default Keycloak login screen with a branded ATS page and adds a **Request HR account** button. The button uses the Keycloak client Base URL when configured, and falls back to:

`http://localhost:4200/register`

## Enable It

1. Start Keycloak with Docker Compose:

   ```bash
   docker compose up -d keycloak
   ```

2. Open the Keycloak admin console:

   `http://localhost:8080`

3. Go to:

   `Realm settings -> Themes -> Login theme`

4. Select:

   `cv-smartmatch`

5. Save.

## Recommended Client Setting

In the `cv-frontend` client, set:

- Base URL: `http://localhost:4200`
- Valid redirect URIs: `http://localhost:4200/*`
- Web origins: `http://localhost:4200`

With Base URL set, the theme link resolves to:

`http://localhost:4200/register`
