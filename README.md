# 🚀 CV Filter: AI-Powered Applicant Tracking System

> **AI-powered Applicant Tracking System with intelligent CV parsing, semantic candidate search, recruitment analytics, and enterprise-grade document/security integration.**

CV Filter is a modern, flagship Applicant Tracking System (ATS) designed to streamline the recruitment process. It leverages advanced Artificial Intelligence for intelligent CV parsing and semantic matching, integrated with secure document storage and enterprise identity management, all wrapped in a premium, dark-themed SaaS interface.

---

## ✨ Features

### 🧠 AI Features
- **Smart Candidate Search**: Semantic matching beyond mere keyword search.
- **Explainable AI Scoring**: Transparent match explanations so you know *why* a candidate ranks high.
- **Intelligent CV Parsing**: Automated extraction of contact info, skills, education, and experience.
- **Job-Description Matching**: Direct comparison of CVs against job requirements.
- **Chatbot Assistant**: Conversational HR assistant powered by Ollama integration.

### 👥 Recruitment Features
- **Candidate Comparison**: Side-by-side analysis of shortlisted profiles.
- **Shortlist Management**: Organize and track top candidates efficiently.
- **Parsing Warnings**: Alerts for incomplete or ambiguous CV data extraction.
- **Pagination & Filtering**: Seamlessly navigate through large candidate pools.

### 🛡️ Security Features
- **Keycloak RBAC**: Robust Role-Based Access Control distinguishing ADMIN and HR permissions.
- **Protected APIs**: Secure endpoints ensuring data privacy.
- **Audit Logs**: Comprehensive tracking of user actions and system events.

### 📂 Document Management
- **Alfresco Storage**: Enterprise-grade, secure CV document storage.
- **Upload/Download Lifecycle**: Full control over candidate document availability.

### 💻 UX/UI Features
- **Modern Dark UI**: A sleek, premium SaaS aesthetic reducing eye strain.
- **Glassmorphism**: Elegant, modern design elements.
- **Responsive Layout**: Optimized for various screen sizes.

---

## 🏗️ Architecture Overview

The system is built on a robust, decoupled architecture:

**Frontend (Angular)** ➔ **Backend (Spring Boot)** ➔ **AI Services (Ollama)**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;⬇
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**Databases & Infrastructure**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• MongoDB (Core Data)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• PostgreSQL (Auth/Docs)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Keycloak (Identity)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Alfresco (Document Content)

- **Frontend**: Delivers a rich, interactive, and responsive user experience.
- **Backend**: Orchestrates business logic, API endpoints, and service integrations.
- **AI Services**: Local Ollama models handle heavy lifting for embeddings and semantic analysis.
- **Databases**: Segregated storage for operational data vs. authentication and document metadata.
- **Alfresco & Keycloak**: Provide enterprise document management and identity provisioning.

---

## 🤖 AI Engine

At the heart of CV Filter is a sophisticated AI Engine:
- **CV Parsing**: Uses regular expressions, heuristics, and NLP to structure unstructured CV data.
- **Embeddings & Semantic Search**: Converts CV content into vector embeddings to understand the contextual meaning of candidate experience.
- **Hybrid Scoring**: Combines precise keyword matching with semantic similarity for highly accurate candidate ranking.
- **Explainable Ranking**: The system isn't a black box; it provides concrete reasons for candidate scores based on matched skills and experience.
- **Fallback Behavior**: Ensures continuous operation with traditional search methodologies if embedding services are temporarily unavailable.
- **Ollama Integration**: Runs localized, privacy-preserving AI models without sending sensitive candidate data to third-party APIs.

---

## 🔍 Smart Search

The Smart Search module redefines candidate discovery:
- **Semantic Matching**: Understands related terms (e.g., "React" and "Frontend Developer").
- **Structured Scoring**: Candidates are ranked numerically based on strict alignment with the query.
- **Seniority Detection**: Intelligently infers candidate experience levels (Junior, Mid, Senior).
- **Skill Matching**: Highlights specifically requested skills found in the profile.
- **Match Explanations & Missing Requirements**: Clearly outlines why a candidate is a good fit and what key requirements they might lack.

---

## 🔐 Security

Enterprise-grade security is baked in from day one:
- **Keycloak Authentication**: Centralized, secure identity management.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN` (system configuration, audit logs) and `HR` (candidate management, searching).
- **Audit Logging**: Immutable tracking of critical actions (uploads, deletions, system changes) for compliance and accountability.
- **Protected APIs**: All backend endpoints require valid JWT validation.

---

## 📄 Document Management

Integrated with **Alfresco** Content Services to ensure document integrity:
- **Secure CV Storage**: Original PDF/Word documents are stored securely in Alfresco, not merely the file system.
- **Upload/Download Lifecycle**: APIs strictly control who can view, download, or manage candidate files.

---

## 💬 Chatbot Assistant

The integrated Chatbot acts as a conversational HR co-pilot:
- **Candidate Search**: "Find me Java developers with 5 years of experience."
- **CV Summarization**: Instantly digest a 3-page CV into a brief paragraph.
- **Job Matching & Candidate Comparison**: Ask the bot to compare two candidates for a specific role and provide a recommendation.

---

## 🎨 UI/UX

Designed with a focus on modern aesthetics and usability:
- **Dark SaaS Interface**: A sleek, dark-themed UI that feels professional and reduces eye fatigue during long screening sessions.
- **Glassmorphism**: Subtle translucent elements create depth and a premium feel.
- **Premium UX**: Smooth transitions, micro-animations, and intuitive navigation flows.
- **Responsive Layout**: Fully functional across desktop, tablet, and mobile views.

---

## 📸 Screenshots

*(Placeholders for actual project screenshots)*

- **Dashboard**: `![Dashboard UI](placeholder)`
- **Candidate Management**: `![Candidate Management](placeholder)`
- **Smart Search**: `![Smart Search Results](placeholder)`
- **Chatbot**: `![Chatbot Interface](placeholder)`
- **Audit Logs**: `![Audit Logs View](placeholder)`
- **Upload Flow**: `![Upload & Parse Flow](placeholder)`

---

## 🔄 Recruiter Workflow

How a recruiter uses CV Filter in the real world:
1. **Upload CV**: Drag-and-drop single or bulk CVs into the platform.
2. **AI Parsing**: The system automatically extracts key details and generates embeddings.
3. **Review Candidate**: HR reviews the parsed profile, addressing any parsing warnings.
4. **Smart Search**: Enter a job description or key requirements to query the database.
5. **Compare Candidates**: Analyze top matches using explainable AI scoring.
6. **Shortlist**: Add the best fits to a dedicated shortlist.
7. **Hiring Decision**: Export data or proceed to interview stages.

---

## 🛠️ Tech Stack

**Frontend**
- Angular 18
- TypeScript
- Tailwind CSS / Custom SCSS
- RxJS

**Backend**
- Java 21
- Spring Boot 3
- Spring Security

**AI & Analytics**
- Ollama (Local LLM & Embeddings)
- LangChain4j (Integration)

**Security & Auth**
- Keycloak

**Databases & Storage**
- MongoDB (Application Data)
- PostgreSQL (Keycloak & Alfresco)
- Alfresco (Document Content)

**Infrastructure**
- Docker & Docker Compose
- Maven / Node.js

---

## ⚙️ Installation & Setup

To run this project locally, ensure you have [Docker](https://www.docker.com/), [Java 21](https://adoptium.net/), and [Node.js](https://nodejs.org/) installed.

### 1. Start the Infrastructure
The project relies on external services defined in `docker-compose.yml`.
```bash
# From the project root directory
docker-compose up -d
```
*Starts Keycloak (8080), Alfresco (8082), MongoDB (27017), and PostgreSQL (5432, 5433). Note: First startup may take a few minutes.*

### 2. Run the Backend (Spring Boot)
```bash
cd cv-filter-back/cvfilterback
./mvnw spring-boot:run
```
*Backend server starts on `http://localhost:8081`.*

### 3. Run the Frontend (Angular)
```bash
cd cv-filter-front
npm install
npm start
```
*Frontend application available at `http://localhost:4200`.*

---

## 🔌 API Endpoints

A sample of available REST APIs:

- **Candidate Upload**: `POST /api/candidates/upload` - Uploads document to Alfresco and triggers AI parsing.
- **Smart Search**: `POST /api/search/semantic` - Queries candidates using embeddings and hybrid scoring.
- **Chatbot**: `POST /api/chat/message` - Interacts with the Ollama HR assistant.
- **Audit Logs**: `GET /api/audit/logs` - Retrieves system audit trails (ADMIN only).
- **Export**: `GET /api/candidates/export/csv` - Exports shortlisted candidates.

---

## 🧪 Testing

The platform ensures reliability through rigorous testing:
- **Backend Tests**: JUnit & Mockito for core services and API endpoints.
- **Parser Tests**: Dedicated testing for Regex, heuristics, and phone/address extraction accuracy.
- **Scoring Tests**: Verification of the hybrid scoring algorithm and embedding fallbacks.
- **Frontend Verification**: Angular unit tests and production build verification.
- **Debug Endpoints**: Included `/api/debug/extract-cv` for real-time parser tuning without database commits.

---

## 🚀 Future Improvements

Roadmap for upcoming features:
- **OCR Integration**: Support for parsing scanned, image-based CVs.
- **Email Integration**: Automated candidate communication directly from the platform.
- **Interview Scheduling**: Built-in calendar synchronization for HR teams.
- **Analytics Dashboard**: Advanced metrics on time-to-hire and pipeline health.
- **AI Interview Generation**: Dynamically generate technical questions based on the candidate's parsed CV.
- **Multilingual Parsing**: Enhanced support for diverse languages and regional CV formats.

---

### 🎓 About This Project

This project was developed as a comprehensive Proof of Concept and Final Year Project (PFE). It demonstrates the practical application of modern software engineering principles, microservice architecture, and applied artificial intelligence in solving real-world enterprise recruitment challenges. It is built to enterprise standards to showcase a modern, scalable SaaS vision.
