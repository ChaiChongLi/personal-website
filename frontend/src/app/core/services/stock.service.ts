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
  // Price data — null when fetch fails or symbol not found
  currentPrice: number | null;
  priceChange: number | null;
  changePercent: number | null;
  // KLSE Screener provides these as pre-formatted strings; Google Finance leaves them null
  volume: string | null;
  marketCap: string | null;
  // KLSE-specific fields (null for non-KLSE stocks)
  dy: string | null;   // Dividend Yield, e.g. "6.52%"
  pe: string | null;   // Price/Earnings ratio, e.g. "12.34"
  nta: string | null;  // Net Tangible Assets per share, e.g. "1.23"
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
   * Map raw backend row to StockItem.
   * KLSE stocks are enriched via KLSE Screener (volume, marketCap, dy, pe, nta available).
   * Other markets use Google Finance (only price, change, changePercent available).
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
      marketCap: raw.marketCap ?? null,
      dy: raw.dy ?? null,
      pe: raw.pe ?? null,
      nta: raw.nta ?? null,
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
   * PUT /stocks/:id — Update symbol, market, company name, and/or notes
   */
  updateStock(id: string, updates: {
    symbol?: string;
    market?: string;
    companyName?: string;
    notes?: string;
  }): Observable<any> {
    const payload: any = {};
    if (updates.symbol      !== undefined) payload.symbol       = updates.symbol;
    if (updates.market      !== undefined) payload.market       = updates.market;
    if (updates.companyName !== undefined) payload.company_name = updates.companyName;
    if (updates.notes       !== undefined) payload.notes        = updates.notes;

    return this.http.put<any>(`${environment.apiUrl}/stocks/${id}`, payload).pipe(
      map((response: any) => response.data),
      tap(() => {
        // Invalidate cache so the next load fetches fresh enriched data
        this.cachedWatchlist = null;
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
