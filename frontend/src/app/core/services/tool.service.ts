import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Tool {
  id: string;
  name: string;
  description: string;
  githubUrl: string;
  tags: string[];
  category: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolFilters {
  category?: string;
  isFavorite?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToolService {
  constructor(private http: HttpClient) {}

  /**
   * Map raw DB row (snake_case) to Tool interface (camelCase).
   */
  private mapTool(raw: any): Tool {
    return {
      id: String(raw.id),
      name: raw.name,
      description: raw.description || '',
      githubUrl: raw.github_url || raw.githubUrl || '',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      category: raw.category || '',
      isFavorite: Boolean(raw.is_favorite ?? raw.isFavorite),
      createdAt: raw.created_at || raw.createdAt || '',
      updatedAt: raw.updated_at || raw.updatedAt || '',
    };
  }

  getTools(filters?: ToolFilters): Observable<Tool[]> {
    let url = `${environment.apiUrl}/tools`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.isFavorite !== undefined) params.append('is_favorite', String(filters.isFavorite));
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    return this.http.get<any>(url).pipe(
      map(r => (r.data as any[]).map(t => this.mapTool(t)))
    );
  }

  createTool(data: {
    name: string;
    category: string;
    githubUrl: string;
    description: string;
    tags: string[];
  }): Observable<Tool> {
    return this.http.post<any>(`${environment.apiUrl}/tools`, {
      name: data.name,
      github_url: data.githubUrl,   // map camelCase → snake_case for backend
      description: data.description,
      tags: data.tags,
      category: data.category,
    }).pipe(
      map(r => this.mapTool(r.data))
    );
  }

  updateTool(id: string, data: Partial<{ name: string; githubUrl: string; description: string; tags: string[]; category: string }>): Observable<Tool> {
    const payload: any = {};
    if (data.name !== undefined)        payload.name = data.name;
    if (data.githubUrl !== undefined)   payload.github_url = data.githubUrl;
    if (data.description !== undefined) payload.description = data.description;
    if (data.tags !== undefined)        payload.tags = data.tags;
    if (data.category !== undefined)    payload.category = data.category;

    return this.http.put<any>(`${environment.apiUrl}/tools/${id}`, payload).pipe(
      map(r => this.mapTool(r.data))
    );
  }

  deleteTool(id: string): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${environment.apiUrl}/tools/${id}`).pipe(
      map(r => ({ success: r.success }))
    );
  }

  /**
   * Toggle favorite — backend route: PATCH /tools/:id/favorite
   * Returns { id, is_favorite } — caller merges with existing tool.
   */
  toggleFavorite(id: string): Observable<{ id: string; isFavorite: boolean }> {
    return this.http.patch<any>(`${environment.apiUrl}/tools/${id}/favorite`, {}).pipe(
      map(r => ({ id: String(r.data.id), isFavorite: Boolean(r.data.is_favorite) }))
    );
  }
}
