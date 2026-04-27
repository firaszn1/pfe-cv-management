import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CandidateResponse {
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
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  educationEntries: string[];
  experienceEntries: string[];
  projectEntries: string[];
  certifications: string[];
  cvFileName: string;
  alfrescoNodeId?: string | null;
  alfrescoFileUrl?: string | null;
  createdAt: string;
  aiMatchScore: number | null;
  scoreBreakdown?: ScoreBreakdownResponse | null;
}

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

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api';

  uploadCv(file: File): Observable<UploadCandidateResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadCandidateResponse>(`${this.apiUrl}/hr/candidates/upload`, formData);
  }

  getAllCandidates(): Observable<CandidateResponse[]> {
    return this.http.get<CandidateResponse[]>(`${this.apiUrl}/hr/candidates`);
  }

  getCandidateById(id: string): Observable<CandidateResponse> {
    return this.http.get<CandidateResponse>(`${this.apiUrl}/hr/candidates/${id}`);
  }

  updateCandidate(id: string, candidate: CandidateResponse): Observable<CandidateResponse> {
    return this.http.put<CandidateResponse>(`${this.apiUrl}/hr/candidates/${id}`, candidate);
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

  filterCandidates(request: CandidateFilterRequest): Observable<CandidateResponse[]> {
    return this.http.post<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/filter`, request);
  }

  smartSearch(request: SmartSearchRequest): Observable<CandidateResponse[]> {
    return this.http.post<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/smart-search`, request);
  }

  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/hr/dashboard/stats`);
  }

  generateInterviewKit(candidateId: string): Observable<InterviewKitResponse> {
    return this.http.post<InterviewKitResponse>(`${this.apiUrl}/interview-kit/${candidateId}`, {});
  }

  matchJobDescription(request: JobMatchRequest): Observable<JobMatchResponse> {
    return this.http.post<JobMatchResponse>(`${this.apiUrl}/job-match`, request);
  }

  compareCandidates(candidateIds: string[]): Observable<CandidateCompareResponse> {
    return this.http.post<CandidateCompareResponse>(`${this.apiUrl}/candidates/compare`, { candidateIds });
  }
}
