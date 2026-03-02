import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TechFeedItem {
  id: number;
  source: 'hackernews' | 'devto' | 'github';
  title: string;
  url: string;
  author: string | null;
  publishedAt: string | null;
  score: number;
  snippet: string | null;
  extraData: { comments?: number; language?: string; starsToday?: number } | null;
  cachedAt: string;
}

export interface TechFeedResponse {
  sources: string[];
  items: TechFeedItem[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class TechFeedService {
  constructor(private http: HttpClient) {}

  private mapItem(raw: any): TechFeedItem {
    let extraData: TechFeedItem['extraData'] = null;
    if (raw.extra_data) {
      try {
        extraData = typeof raw.extra_data === 'string'
          ? JSON.parse(raw.extra_data)
          : raw.extra_data;
      } catch {
        extraData = null;
      }
    }
    return {
      id: raw.id,
      source: raw.source,
      title: raw.title,
      url: raw.url,
      author: raw.author || null,
      publishedAt: raw.published_at || raw.publishedAt || null,
      score: raw.score ?? 0,
      snippet: raw.snippet || null,
      extraData,
      cachedAt: raw.created_at || raw.cachedAt || ''
    };
  }

  private mapResponse(r: any): TechFeedResponse {
    const data = r.data as { sources: string[]; items: any[]; total: number };
    return {
      sources: data.sources,
      items: (data.items || []).map((i: any) => this.mapItem(i)),
      total: data.total
    };
  }

  /** Read tech feed from DB cache — no external fetch. Used on page open. */
  getCachedFeed(): Observable<TechFeedResponse> {
    return this.http
      .get<any>(`${environment.apiUrl}/tech-feed/cached`)
      .pipe(map(r => this.mapResponse(r)));
  }

  /** Fetch fresh tech feed from all three sources (triggers external API calls). */
  fetchFreshFeed(): Observable<TechFeedResponse> {
    return this.http
      .get<any>(`${environment.apiUrl}/tech-feed`)
      .pipe(map(r => this.mapResponse(r)));
  }
}
