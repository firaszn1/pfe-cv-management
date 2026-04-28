import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface AuditLogResponse {
  id: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  timestamp: string;
  details: string;
}

export interface AuditLogPageResponse {
  content: AuditLogResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface AuditLogFilterParams {
  page?: number;
  size?: number;
  actor?: string;
  action?: string;
  targetType?: string;
  keyword?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private http = inject(HttpClient);
  private apiBaseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.apiBaseUrl}/admin/users`;

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

  getAuditLogs(filters: AuditLogFilterParams = {}): Observable<AuditLogPageResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 0))
      .set('size', String(filters.size ?? 20));

    if (filters.actor?.trim()) {
      params = params.set('actor', filters.actor.trim());
    }
    if (filters.action?.trim()) {
      params = params.set('action', filters.action.trim());
    }
    if (filters.targetType?.trim()) {
      params = params.set('targetType', filters.targetType.trim());
    }
    if (filters.keyword?.trim()) {
      params = params.set('keyword', filters.keyword.trim());
    }

    return this.http.get<AuditLogPageResponse>(`${this.apiBaseUrl}/admin/audit-logs`, { params });
  }
}
