import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CandidateResponse } from './candidate.service';

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  selectedCandidateId?: string | null;
}

export interface ChatCandidateResponse {
  candidate: CandidateResponse;
  explanation: string;
  reasons: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ChatResponse {
  conversationId: string;
  intent: string;
  message: string;
  explanation: string;
  topCandidate: ChatCandidateResponse | null;
  candidates: ChatCandidateResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/chat';

  send(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }
}
