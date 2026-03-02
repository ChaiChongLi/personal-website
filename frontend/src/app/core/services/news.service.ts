import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface NewsItem {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
  cachedAt?: string; // created_at from DB, present when reading from cache
}

export interface WatchlistNewsData {
  totalSymbols: number;
  symbols: Record<string, NewsItem[]>;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  constructor(private http: HttpClient) {}

  private mapNewsItem(raw: any): NewsItem {
    return {
      headline: raw.headline || '',
      source: raw.source || 'Google News',
      url: raw.url || '',
      publishedAt: raw.published_at || raw.publishedAt || '',
      snippet: raw.snippet || '',
      cachedAt: raw.created_at || raw.cachedAt
    };
  }

  private mapWatchlistResponse(r: any): WatchlistNewsData {
    const raw = r.data as { totalSymbols: number; symbols: Record<string, any[]> };
    const mapped: Record<string, NewsItem[]> = {};
    Object.keys(raw.symbols).forEach(sym => {
      mapped[sym] = (raw.symbols[sym] || []).map((item: any) => this.mapNewsItem(item));
    });
    return { totalSymbols: raw.totalSymbols, symbols: mapped };
  }

  /** Load cached news from DB for all watchlist stocks (no external fetch). Used on page open. */
  getCachedWatchlistNews(): Observable<WatchlistNewsData> {
    return this.http.get<any>(`${environment.apiUrl}/news/cached`).pipe(
      map(r => this.mapWatchlistResponse(r))
    );
  }

  /** Fetch fresh news from Google for all watchlist stocks (on-demand). */
  getNewsForWatchlist(): Observable<WatchlistNewsData> {
    return this.http.get<any>(`${environment.apiUrl}/news`).pipe(
      map(r => this.mapWatchlistResponse(r))
    );
  }

  /** Fetch news for a single stock symbol. */
  getNewsBySymbol(symbol: string): Observable<NewsItem[]> {
    return this.http.get<any>(`${environment.apiUrl}/news/${symbol}`).pipe(
      map(r => (r.data.articles as any[]).map(item => this.mapNewsItem(item)))
    );
  }
}
