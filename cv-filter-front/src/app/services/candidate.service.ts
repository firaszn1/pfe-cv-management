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
  cvFileName: string;
  createdAt: string;
  aiMatchScore: number | null;
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

  filterCandidates(request: CandidateFilterRequest): Observable<CandidateResponse[]> {
    return this.http.post<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/filter`, request);
  }

  smartSearch(request: SmartSearchRequest): Observable<CandidateResponse[]> {
    return this.http.post<CandidateResponse[]>(`${this.apiUrl}/hr/candidates/smart-search`, request);
  }

  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/hr/dashboard/stats`);
  }
}