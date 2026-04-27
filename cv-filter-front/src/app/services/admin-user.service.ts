import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  enabled: boolean | null;
  emailVerified: boolean | null;
  roles: string[];
}

export interface AdminUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  enabled: boolean;
  roles: string[];
}

export interface UpdateUserRolesRequest {
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/admin/users';

  getUsers(): Observable<AdminUserResponse[]> {
    return this.http.get<AdminUserResponse[]>(this.apiUrl);
  }

  getPendingUsers(): Observable<AdminUserResponse[]> {
    return this.http.get<AdminUserResponse[]>(`${this.apiUrl}/pending`);
  }

  getUserById(id: string): Observable<AdminUserResponse> {
    return this.http.get<AdminUserResponse>(`${this.apiUrl}/${id}`);
  }

  createUser(request: AdminUserRequest): Observable<AdminUserResponse> {
    return this.http.post<AdminUserResponse>(this.apiUrl, request);
  }

  updateUser(id: string, request: AdminUserRequest): Observable<AdminUserResponse> {
    return this.http.put<AdminUserResponse>(`${this.apiUrl}/${id}`, request);
  }

  updateRoles(id: string, request: UpdateUserRolesRequest): Observable<AdminUserResponse> {
    return this.http.put<AdminUserResponse>(`${this.apiUrl}/${id}/roles`, request);
  }

  approveUser(id: string): Observable<AdminUserResponse> {
    return this.http.put<AdminUserResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/reject`);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
