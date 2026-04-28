import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CandidateResponse {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  skills: string[];
  languages: string[];
  yearsOfExperience: number | null;
  seniorityLevel: string | null;
  currentJobTitle: string | null;
  highestDegree: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  educationEntries: string[];
  experienceEntries: string[];
  projectEntries: string[];
  certifications: string[];
  cvFileName: string | null;
  alfrescoNodeId?: string | null;
  alfrescoFileUrl?: string | null;
  createdAt: string | null;
  aiMatchScore?: number | null;
  scoreBreakdown?: ScoreBreakdownResponse | null;
  status: CandidateStatus;
  shortlisted: boolean;
  parsingWarnings: string[];
}

export type CandidateStatus = 'NEEDS_REVIEW' | 'NEW' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'REJECTED' | 'HIRED';

export interface ScoreBreakdownResponse {
  globalScore: number;
  skillsMatch: number;
  experienceMatch: number;
  seniorityMatch: number;
  titleMatch: number;
}

export interface UploadCandidateResponse {
  candidateId: string;
  fileName: string;
  message: string;
}

export interface SkillCountResponse {
  skill: string;
  count: number;
}

export interface DashboardStatsResponse {
  totalCandidates: number;
  juniorCount: number;
  midCount: number;
  seniorCount: number;
  topSkills: SkillCountResponse[];
}

export interface CandidateFilterRequest {
  fullName?: string;
  skill?: string;
  seniorityLevel?: string;
  minExperience?: number | null;
  currentJobTitle?: string;
  status?: string;
}

export interface SmartSearchRequest {
  query: string;
}

export interface InterviewKitResponse {
  candidateId: string;
  candidateName: string;
  seniorityLevel: string;
  jobTitle: string;
  technical: string[];
  project: string[];
  hr: string[];
  clarification: string[];
}

export interface JobMatchRequest {
  description: string;
}

export interface JobMatchResponse {
  extractedSkills: string[];
  seniority: string | null;
  keywords: string[];
  candidates: CandidateResponse[];
}

export interface CandidateCompareResponse {
  candidates: CandidateResponse[];
  comparison: {
    skillsOverlap: string[];
    experienceDifference: string;
    strengths: string[];
    weaknesses: string[];
  };
}

export interface CandidatePageResponse {
  content: CandidateResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  uploadCv(file: File): Observable<UploadCandidateResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadCandidateResponse>(`${this.apiUrl}/hr/candidates/upload`, formData);
  }

  getCandidatesPage(page = 0, size = 10, sort?: string): Observable<CandidatePageResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      size: size.toString()
    };
    if (sort) {
      params['sort'] = sort;
    }

    return this.http.get<CandidatePageResponse>(`${this.apiUrl}/hr/candidates`, { params }).pipe(
      map((response) => this.normalizeCandidatePage(response))
    );
  }

  getCandidateById(id: string): Observable<CandidateResponse> {
    return this.http.get<CandidateResponse>(`${this.apiUrl}/hr/candidates/${id}`).pipe(
      map((candidate) => this.normalizeCandidate(candidate))
    );
  }

  updateCandidate(id: string, candidate: CandidateResponse): Observable<CandidateResponse> {
    return this.http.put<CandidateResponse>(`${this.apiUrl}/hr/candidates/${id}`, candidate).pipe(
      map((updated) => this.normalizeCandidate(updated))
    );
  }

  deleteCandidate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/candidates/${id}`);
  }

  viewCv(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/hr/candidates/${id}/cv/view`, { responseType: 'blob' });
  }

  downloadCv(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/hr/candidates/${id}/cv/download`, { responseType: 'blob' });
  }

  updateStatus(id: string, status: CandidateStatus): Observable<CandidateResponse> {
    return this.http.put<CandidateResponse>(`${this.apiUrl}/hr/candidates/${id}/status`, { status }).pipe(
      map((candidate) => this.normalizeCandidate(candidate))
    );
  }

  toggleShortlist(id: string): Observable<CandidateResponse> {
    return this.http.put<CandidateResponse>(`${this.apiUrl}/hr/candidates/${id}/shortlist`, {}).pipe(
      map((candidate) => this.normalizeCandidate(candidate))
    );
  }

  getShortlistedCandidates(): Observable<CandidateResponse[]> {
    return this.http.get<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/shortlisted`).pipe(
      map((candidates) => this.normalizeCandidates(candidates))
    );
  }

  filterCandidates(request: CandidateFilterRequest): Observable<CandidateResponse[]> {
    return this.http.post<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/filter`, request).pipe(
      map((candidates) => this.normalizeCandidates(candidates))
    );
  }

  smartSearch(request: SmartSearchRequest): Observable<CandidateResponse[]> {
    return this.http.post<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/smart-search`, request).pipe(
      map((candidates) => this.normalizeCandidates(candidates))
    );
  }

  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/hr/dashboard/stats`);
  }

  generateInterviewKit(candidateId: string): Observable<InterviewKitResponse> {
    return this.http.post<InterviewKitResponse>(`${this.apiUrl}/interview-kit/${candidateId}`, {});
  }

  matchJobDescription(request: JobMatchRequest): Observable<JobMatchResponse> {
    return this.http.post<JobMatchResponse>(`${this.apiUrl}/job-match`, request).pipe(
      map((response) => ({
        ...response,
        extractedSkills: response?.extractedSkills || [],
        keywords: response?.keywords || [],
        candidates: this.normalizeCandidates(response?.candidates || [])
      }))
    );
  }

  compareCandidates(candidateIds: string[]): Observable<CandidateCompareResponse> {
    return this.http.post<CandidateCompareResponse>(`${this.apiUrl}/hr/candidates/compare`, { candidateIds }).pipe(
      map((response) => ({
        ...response,
        candidates: this.normalizeCandidates(response?.candidates || []),
        comparison: {
          skillsOverlap: response?.comparison?.skillsOverlap || [],
          experienceDifference: response?.comparison?.experienceDifference || '',
          strengths: response?.comparison?.strengths || [],
          weaknesses: response?.comparison?.weaknesses || []
        }
      }))
    );
  }

  regenerateEmbeddings(): Observable<{ regenerated: number; message: string }> {
    return this.http.post<{ regenerated: number; message: string }>(`${this.apiUrl}/ai/regenerate-embeddings`, {});
  }

  exportCandidate(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/hr/candidates/${id}/export`, { responseType: 'blob' });
  }

  exportShortlist(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/hr/candidates/shortlist/export`, { responseType: 'blob' });
  }

  private normalizeCandidates(candidates: CandidateResponse[] | null | undefined): CandidateResponse[] {
    return (candidates || []).map((candidate) => this.normalizeCandidate(candidate));
  }

  private normalizeCandidatePage(response: CandidatePageResponse | null | undefined): CandidatePageResponse {
    return {
      content: this.normalizeCandidates(response?.content || []),
      totalElements: response?.totalElements ?? 0,
      totalPages: response?.totalPages ?? 0,
      currentPage: response?.currentPage ?? 0
    };
  }

  private normalizeCandidate(candidate: CandidateResponse): CandidateResponse {
    return {
      ...candidate,
      fullName: candidate?.fullName ?? null,
      email: candidate?.email ?? null,
      phone: candidate?.phone ?? null,
      address: candidate?.address ?? null,
      currentJobTitle: candidate?.currentJobTitle ?? null,
      highestDegree: candidate?.highestDegree ?? null,
      yearsOfExperience: candidate?.yearsOfExperience ?? null,
      seniorityLevel: candidate?.seniorityLevel ?? null,
      skills: Array.isArray(candidate?.skills) ? candidate.skills : [],
      languages: Array.isArray(candidate?.languages) ? candidate.languages : [],
      educationEntries: Array.isArray(candidate?.educationEntries) ? candidate.educationEntries : [],
      experienceEntries: Array.isArray(candidate?.experienceEntries) ? candidate.experienceEntries : [],
      projectEntries: Array.isArray(candidate?.projectEntries) ? candidate.projectEntries : [],
      certifications: Array.isArray(candidate?.certifications) ? candidate.certifications : [],
      parsingWarnings: Array.isArray(candidate?.parsingWarnings) ? candidate.parsingWarnings : [],
      status: candidate?.status || 'NEW',
      shortlisted: candidate?.shortlisted === true,
      aiMatchScore: candidate?.aiMatchScore ?? null,
      scoreBreakdown: candidate?.scoreBreakdown ?? null,
      cvFileName: candidate?.cvFileName ?? null,
      createdAt: candidate?.createdAt ?? null
    };
  }
}
