import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CandidateResponse } from './candidate.service';

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  selectedCandidateId?: string | null;
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

export interface ChatCandidateResponse {
  candidate: CandidateResponse;
  explanation: string;
  reasons: string[];
  strengths: string[];
  weaknesses: string[];
  hiringRecommendation?: string;
}

export interface ChatResponse {
  conversationId: string;
  intent: string;
  message: string;
  explanation: string;
  topCandidate: ChatCandidateResponse | null;
  candidates: ChatCandidateResponse[];
  suggestedActions: string[];
  interviewKit?: InterviewKitResponse;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/chat`;

  send(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }
}
