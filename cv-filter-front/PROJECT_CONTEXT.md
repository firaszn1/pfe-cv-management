# CV Filter Front - Project Context

## Purpose

`cv-filter-front` is an Angular frontend for an HR CV management and candidate search platform. It lets authenticated HR/admin users upload resumes, view dashboard statistics, browse and filter candidate profiles, run AI-powered smart search, edit extracted candidate data, and delete candidates when the logged-in user has the `ADMIN` role.

The UI brand shown in the app shell is **CV SmartMatch**.

## Tech Stack

- Angular `20.3.x`
- Standalone Angular components and application config
- TypeScript `~5.9.2` with strict compiler settings
- Angular Router
- Angular HttpClient with functional interceptor
- Template-driven forms via `FormsModule`
- Keycloak authentication via `keycloak-js`
- Karma/Jasmine test tooling

## Runtime Services

The frontend assumes two local services are running:

- Angular dev server: `http://localhost:4200`
- Keycloak server: `http://localhost:8080`
- Backend API server: `http://localhost:8081`

Keycloak configuration is hardcoded in `src/app/keycloak.ts`:

- URL: `http://localhost:8080`
- Realm: `cv-realm`
- Client ID: `cv-frontend`

Backend API base URL is hardcoded in `src/app/services/candidate.service.ts`:

- `http://localhost:8081/api`

## Common Commands

```bash
npm start
npm run build
npm test
```

`npm start` runs `ng serve` and serves the app on the Angular default port unless overridden.

## Application Bootstrap

Main entrypoint:

- `src/main.ts`

Application providers:

- `src/app/app.config.ts`

The app uses `APP_INITIALIZER` to initialize Keycloak before the application becomes usable:

- `onLoad: 'login-required'`
- `checkLoginIframe: false`

This means unauthenticated users are redirected to Keycloak login during startup.

HTTP requests are configured with `provideHttpClient(withInterceptors([authInterceptor]))`. The interceptor reads `keycloak.token` and adds:

```http
Authorization: Bearer <token>
```

## Routes

Defined in `src/app/app.routes.ts`:

| Path | Component | Purpose |
| --- | --- | --- |
| `/` | Redirect | Redirects to `/dashboard` |
| `/dashboard` | `DashboardComponent` | Recruitment stats and top skills |
| `/upload` | `UploadComponent` | Upload PDF/DOCX CV files |
| `/candidates` | `CandidatesComponent` | Browse, smart-search, filter, edit/delete entry point |
| `/candidates/edit/:id` | `EditCandidateComponent` | Edit candidate profile |
| `**` | Redirect | Redirects unknown paths to `/dashboard` |

## App Shell

Root component:

- `src/app/app.ts`
- `src/app/app.html`
- `src/app/app.css`

The shell contains:

- Fixed/sidebar navigation on desktop
- Links to dashboard, upload, and candidates pages
- Current Keycloak username and realm roles
- Dark/light theme toggle persisted in `localStorage` under `cv-theme`
- Logout button redirecting back to `http://localhost:4200`

Theme support is implemented by toggling `light-theme-root` on `document.documentElement`.

## Candidate API Contract

Client interfaces live in `src/app/services/candidate.service.ts`.

### CandidateResponse

```ts
interface CandidateResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  skills: string[];
  languages: string[];
  yearsOfExperience: number;
  seniorityLevel: string;
  currentJobTitle: string;
  highestDegree: string;
  cvFileName: string;
  createdAt: string;
  aiMatchScore: number | null;
}
```

### Endpoints Used

| Method | URL | Used by |
| --- | --- | --- |
| `POST` | `/api/hr/candidates/upload` | Upload CV |
| `GET` | `/api/hr/candidates` | Load all candidates |
| `GET` | `/api/hr/candidates/:id` | Load candidate for edit |
| `PUT` | `/api/hr/candidates/:id` | Save candidate edits |
| `DELETE` | `/api/admin/candidates/:id` | Delete candidate, UI-gated by `ADMIN` role |
| `POST` | `/api/hr/candidates/filter` | Manual filters |
| `POST` | `/api/hr/candidates/smart-search` | AI smart search |
| `GET` | `/api/hr/dashboard/stats` | Dashboard cards and top skills |

## Pages And Behavior

### Dashboard

Files:

- `src/app/pages/dashboard/dashboard.component.ts`
- `src/app/pages/dashboard/dashboard.component.html`
- `src/app/pages/dashboard/dashboard.component.css`

On init, loads dashboard stats from `getDashboardStats()`.

Displays:

- Total candidates
- Junior, Mid, Senior counts
- Top skills with proportional bars
- Static insight/tip panels

If the stats request fails, the component falls back to zero values and an empty top skills list.

### Upload

Files:

- `src/app/pages/upload/upload.component.ts`
- `src/app/pages/upload/upload.component.html`
- `src/app/pages/upload/upload.component.css`

Allows selecting one file and posting it as `multipart/form-data` with form field name `file`.

Accepted extensions in the file input:

- `.pdf`
- `.docx`

The backend response message is shown to the user. If no file is selected, the user sees `Please select a file first`.

### Candidates

File:

- `src/app/pages/candidates/candidates.component.ts`

This component uses an inline template and inline styles.

Behavior:

- Loads all candidates on init.
- Smart search posts `{ query: smartQuery }`.
- Manual filters post `CandidateFilterRequest`.
- Reset clears smart query and filter state, then reloads all candidates.
- Edit button routes to `/candidates/edit/:id`.
- Delete button is only rendered when Keycloak realm roles include `ADMIN`.

Manual filter fields:

- `fullName`
- `skill`
- `seniorityLevel`
- `minExperience`
- `currentJobTitle`

### Edit Candidate

File:

- `src/app/pages/edit-candidate/edit-candidate.component.ts`

This component uses an inline template and inline styles.

Behavior:

- Reads `id` from route params.
- Loads candidate by ID.
- Converts `skills` and `languages` arrays into comma-separated text fields.
- On save, splits comma-separated skills/languages back into arrays.
- Calls `updateCandidate()`.
- Shows success message, then navigates back to `/candidates` after 700 ms.

## Styling

Global styles are configured in `angular.json` as:

- Build: `src/styles.scss`
- Test: `src/styles.css`

Important note: the repo currently contains `src/styles.scss` and `src/stlyes.css`. There is no `src/styles.css`, so the test builder style path looks inconsistent with the actual files.

The app has a dark default theme and light theme overrides. Most visual tokens are CSS custom properties defined per component or in the root app component.

## Auth And Roles

Auth state comes directly from the shared `keycloak` instance:

- Username: `keycloak.tokenParsed?.['preferred_username']`
- Roles: `keycloak.realmAccess?.roles`

There is an `AuthService` wrapper in `src/app/services/auth.service.ts`, but current components mostly import and read the `keycloak` instance directly.

Role-sensitive UI:

- Candidate deletion is only shown when `roles.includes('ADMIN')`.

Backend must still enforce authorization because this is only a frontend visibility check.

## Known Quirks And Follow-Up Items

- Several templates show mojibake icon text in navigation and action labels, likely caused by an encoding mismatch. Replacing these with proper UTF-8 symbols, icon components, or plain text would clean up the UI.
- `angular.json` test styles reference `src/styles.css`, but the repo has `src/styles.scss` and a typo-named `src/stlyes.css`.
- `src/stlyes.css` includes very aggressive global rules such as removing all outlines and borders with `!important`. It is not currently wired into the build config, but if used later it would hurt accessibility and component styling.
- API URLs, Keycloak URLs, realm, client ID, and logout redirect are hardcoded. Consider moving them to Angular environment/config files if the app needs multiple environments.
- Components swallow many API errors by clearing UI state. More explicit error messages would help debugging and user support.
- `CandidatesComponent` and `EditCandidateComponent` use inline templates/styles while the other pages use separate files. This is functional, but consistency may make maintenance easier.
- The frontend checks `ADMIN` before rendering delete controls, but backend authorization remains required for real security.

## Suggested Mental Model For Future Work

Treat this app as a standalone Angular client over a Spring/REST-style backend protected by Keycloak. Most changes will touch one of three layers:

1. **Auth/config layer**: `keycloak.ts`, `app.config.ts`, `auth.interceptor.ts`, `auth.service.ts`
2. **API layer**: `candidate.service.ts` interfaces and endpoint methods
3. **Feature pages**: dashboard, upload, candidates list/search, edit candidate

Before changing candidate fields, update the TypeScript interfaces, all forms/templates that display the field, and the backend DTO/API contract together.
