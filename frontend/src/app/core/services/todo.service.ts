import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoStats {
  pending: number;
  inProgress: number;
  done: number;
  total: number;
  overdue: number;
}

export interface TodoFilters {
  status?: 'pending' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  sortBy?: 'dueDate' | 'createdAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  constructor(private http: HttpClient) {}

  /**
   * Map raw DB row (snake_case) to Todo interface (camelCase).
   * DB stores status as 'in_progress'; frontend uses 'in-progress'.
   */
  private mapTodo(raw: any): Todo {
    return {
      id: String(raw.id),
      title: raw.title,
      description: raw.description || undefined,
      priority: raw.priority,
      status: raw.status === 'in_progress' ? 'in-progress' : raw.status,
      dueDate: raw.due_date || raw.dueDate || undefined,
      createdAt: raw.created_at || raw.createdAt || '',
      updatedAt: raw.updated_at || raw.updatedAt || '',
    };
  }

  /**
   * Map raw stats object (DB underscore keys) to TodoStats interface.
   */
  private mapStats(raw: any): TodoStats {
    return {
      pending: Number(raw.pending) || 0,
      inProgress: Number(raw.in_progress ?? raw.inProgress) || 0,
      done: Number(raw.done) || 0,
      total: Number(raw.total) || 0,
      overdue: Number(raw.overdue) || 0,
    };
  }

  /**
   * Convert frontend status (hyphen) to DB status (underscore).
   */
  private toDbStatus(status: string): string {
    return status === 'in-progress' ? 'in_progress' : status;
  }

  getTodos(filters?: TodoFilters): Observable<Todo[]> {
    let url = `${environment.apiUrl}/todos`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', this.toDbStatus(filters.status));
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }

    // Backend uses sendPaginated → { success, data: [...], pagination }
    return this.http.get<any>(url).pipe(
      map((response: any) => (response.data as any[]).map(r => this.mapTodo(r)))
    );
  }

  getStats(): Observable<TodoStats> {
    return this.http.get<any>(`${environment.apiUrl}/todos/stats`).pipe(
      map((response: any) => this.mapStats(response.data))
    );
  }

  createTodo(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Observable<Todo> {
    const payload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: this.toDbStatus(data.status),
      due_date: data.dueDate || null,  // backend reads due_date (snake_case)
    };

    return this.http.post<any>(`${environment.apiUrl}/todos`, payload).pipe(
      map((response: any) => this.mapTodo(response.data))
    );
  }

  updateTodo(
    id: string,
    data: Partial<Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>>
  ): Observable<any> {
    // Build payload using snake_case field names the backend model accepts
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.status !== undefined) payload.status = this.toDbStatus(data.status);
    if (data.dueDate !== undefined) payload.due_date = data.dueDate;

    return this.http.put<any>(`${environment.apiUrl}/todos/${id}`, payload).pipe(
      map((response: any) => response.data)
    );
  }

  deleteTodo(id: string): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${environment.apiUrl}/todos/${id}`).pipe(
      map((response: any) => ({ success: response.success }))
    );
  }

  bulkUpdateStatus(
    ids: string[],
    status: 'pending' | 'in-progress' | 'done'
  ): Observable<{ success: boolean; updated: number }> {
    return this.http.post<any>(
      `${environment.apiUrl}/todos/bulk-update`,
      { ids, status: this.toDbStatus(status) }
    ).pipe(
      map((response: any) => response.data)
    );
  }

  deleteCompleted(): Observable<{ success: boolean; deleted: number }> {
    return this.http.delete<any>(`${environment.apiUrl}/todos/completed`).pipe(
      map((response: any) => response.data)
    );
  }
}
