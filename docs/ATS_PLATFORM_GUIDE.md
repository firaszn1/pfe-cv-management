# Smart CV Management / ATS Platform

## Architecture

Angular is the UI layer. It calls Spring Boot only.

Spring Boot owns all business logic and integrations:

- MongoDB stores structured candidates, statuses, scores, embeddings, shortlist flags, and audit logs.
- Alfresco stores original CV documents only.
- Keycloak stores users, passwords, enabled state, and roles.

Angular -> Spring Boot -> MongoDB
                     -> Alfresco
                     -> Keycloak Admin API

## Core API

Candidate intake:

- `POST /api/hr/candidates/upload` multipart `file`
- `GET /api/hr/candidates`
- `GET /api/hr/candidates/{id}`
- `PUT /api/hr/candidates/{id}`
- `DELETE /api/admin/candidates/{id}`

Documents:

- `GET /api/hr/candidates/{id}/cv/view`
- `GET /api/hr/candidates/{id}/cv/download`

Lifecycle:

- `PUT /api/hr/candidates/{id}/status` with `{ "status": "INTERVIEW" }`
- `PUT /api/hr/candidates/{id}/shortlist`
- `GET /api/hr/candidates/shortlisted`

AI and decision support:

- `POST /api/hr/candidates/smart-search` with `{ "query": "senior java spring" }`
- `POST /api/job-match` with `{ "description": "full job description" }`
- `POST /api/hr/candidates/compare` with `{ "candidateIds": ["id1", "id2"] }`
- `POST /api/chat`
- `POST /api/interview-kit/{candidateId}`

Admin:

- `POST /api/auth/register-request`
- `GET /api/admin/users`
- `GET /api/admin/users/pending`
- `PUT /api/admin/users/{id}/approve`
- `DELETE /api/admin/users/{id}/reject`
- `GET /api/admin/audit-logs`

Exports:

- `GET /api/hr/candidates/{id}/export`
- `GET /api/hr/candidates/shortlist/export`

Errors use the standard shape:

```json
{
  "timestamp": "2026-04-27T02:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Detailed message",
  "path": "/api/hr/candidates/upload"
}
```

## Installation

Prerequisites:

- Java 21
- Node.js compatible with Angular 20
- Docker Desktop
- MongoDB, Keycloak, Alfresco, and Ollama for full functionality

Run infrastructure:

```bash
docker compose up -d mongodb keycloak
```

Run backend:

```bash
cd cv-filter-back/cvfilterback
./mvnw spring-boot:run
```

Run Angular:

```bash
cd cv-filter-front
npm install
npm start
```

Useful environment variables:

- `MONGODB_URI`
- `KEYCLOAK_ISSUER_URI`
- `KEYCLOAK_SERVER_URL`
- `KEYCLOAK_ADMIN_USERNAME`
- `KEYCLOAK_ADMIN_PASSWORD`
- `ALFRESCO_BASE_URL`
- `ALFRESCO_USERNAME`
- `ALFRESCO_PASSWORD`
- `ALFRESCO_FOLDER_ID`
- `OLLAMA_BASE_URL`
- `OLLAMA_EMBEDDING_MODEL`

## User Guide

Upload CV:

1. Sign in as HR or ADMIN.
2. Open Upload CV.
3. Select a PDF or DOCX under 10MB.
4. After upload, review and correct the extracted profile.

Search candidates:

1. Open Candidates.
2. Use manual filters or AI Search.
3. Review score and score breakdown bars.

Approve HR:

1. Sign in as ADMIN.
2. Open Admin Users.
3. Review pending requests.
4. Approve or reject. Approval assigns HR only.

Shortlist:

1. Open Candidates.
2. Click Shortlist on a profile.
3. Use the Shortlisted filter or export the shortlist.

Interview kit:

1. Open Candidates.
2. Click Interview Kit.
3. Review technical, project, HR, and clarification questions.
