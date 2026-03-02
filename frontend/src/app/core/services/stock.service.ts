import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface StockItem {
  id: string;
  symbol: string;
  market: string; // Exchange code: KLSE, NASDAQ, NYSE, SGX, HKEX (or legacy MY/US/SG)
  companyName: string;
  notes?: string;
  // Price data — null when Google Finance fetch fails or symbol not found
  currentPrice: number | null;
  priceChange: number | null;
  changePercent: number | null;
  volume: number | null;
  high52Week: number | null;
  low52Week: number | null;
  marketCap: number | null;
  addedAt: string;
  lastUpdated: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  lastUpdated = signal<Date | null>(null);
  private cachedWatchlist: StockItem[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Map raw backend row (snake_case + price fields) to StockItem interface.
   * Backend enriches each watchlist entry with: price, change, changePercent from Google Finance.
   * volume, marketCap, fiftyTwoWeekHigh/Low are null (not available from Google Finance scraping).
   */
  private mapStock(raw: any): StockItem {
    return {
      id: String(raw.id),
      symbol: raw.symbol,
      market: raw.market,
      companyName: raw.company_name || raw.companyName || '',
      notes: raw.notes || undefined,
      currentPrice: raw.price ?? null,
      priceChange: raw.change ?? null,
      changePercent: raw.changePercent ?? null,
      volume: raw.volume ?? null,
      high52Week: raw.fiftyTwoWeekHigh ?? null,
      low52Week: raw.fiftyTwoWeekLow ?? null,
      marketCap: raw.marketCap ?? null,
      addedAt: raw.created_at || raw.addedAt || '',
      lastUpdated: raw.lastUpdated || null,
    };
  }

  /**
   * GET /stocks/ — Watchlist with live prices from Google Finance
   */
  getWatchlist(): Observable<StockItem[]> {
    return this.http.get<any>(`${environment.apiUrl}/stocks`).pipe(
      map((response: any) => (response.data as any[]).map(r => this.mapStock(r))),
      tap((stocks) => {
        this.cachedWatchlist = stocks;
        this.lastUpdated.set(new Date());
      })
    );
  }

  /**
   * POST /stocks/ — Add stock to watchlist
   * Response only contains saved metadata (no price data).
   * Caller should reload the full watchlist to get enriched data.
   */
  addStock(
    symbol: string,
    market: string,
    companyName: string,
    notes?: string
  ): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/stocks`, {
      symbol,
      market,
      companyName,
      notes
    }).pipe(
      map((response: any) => response.data)
    );
  }

  /**
   * PUT /stocks/:id — Update notes or company name
   */
  updateStock(id: string, updates: { notes?: string; companyName?: string }): Observable<any> {
    const payload: any = {};
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.companyName !== undefined) payload.company_name = updates.companyName;

    return this.http.put<any>(`${environment.apiUrl}/stocks/${id}`, payload).pipe(
      map((response: any) => response.data),
      tap(() => {
        if (this.cachedWatchlist) {
          const index = this.cachedWatchlist.findIndex(s => s.id === id);
          if (index !== -1 && updates.companyName !== undefined) {
            this.cachedWatchlist[index] = {
              ...this.cachedWatchlist[index],
              companyName: updates.companyName,
              notes: updates.notes ?? this.cachedWatchlist[index].notes,
            };
          }
        }
      })
    );
  }

  /**
   * DELETE /stocks/:id — Remove stock from watchlist
   */
  deleteStock(id: string): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${environment.apiUrl}/stocks/${id}`).pipe(
      map((response: any) => ({ success: response.success })),
      tap(() => {
        if (this.cachedWatchlist) {
          this.cachedWatchlist = this.cachedWatchlist.filter(s => s.id !== id);
        }
      })
    );
  }

  /**
   * GET /stocks/refresh — Refresh prices for all watchlist items.
   * Backend returns same enriched format as GET /stocks.
   */
  refreshPrices(): Observable<StockItem[]> {
    return this.http.get<any>(`${environment.apiUrl}/stocks/refresh`).pipe(
      map((response: any) => (response.data as any[]).map(r => this.mapStock(r))),
      tap((stocks) => {
        this.cachedWatchlist = stocks;
        this.lastUpdated.set(new Date());
      })
    );
  }

  getCachedWatchlist(): StockItem[] | null {
    return this.cachedWatchlist;
  }

  clearCache(): void {
    this.cachedWatchlist = null;
    this.lastUpdated.set(null);
  }
}
