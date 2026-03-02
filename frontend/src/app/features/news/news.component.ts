import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { NewsService, NewsItem, WatchlistNewsData } from '../../core/services/news.service';
import { StockService } from '../../core/services/stock.service';
import { NewsPromptDialogComponent } from './news-prompt-dialog/news-prompt-dialog.component';

interface FlatNewsItem extends NewsItem {
  symbol: string;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  isLoadingCache = signal(false);
  isLoadingFresh = signal(false);
  allArticles = signal<FlatNewsItem[]>([]);
  symbols = signal<string[]>([]);
  selectedSymbol = signal<string>('All');
  dateFilter = signal<string>('24h');
  lastFetchedAt = signal<Date | null>(null);

  /** symbol → company name map built from the stock watchlist */
  private symbolNameMap = new Map<string, string>();

  filteredArticles = computed(() => {
    let articles = this.allArticles();

    const sym = this.selectedSymbol();
    if (sym !== 'All') {
      articles = articles.filter(a => a.symbol === sym);
    }

    const hours = this.dateFilter() === '6h' ? 6 : this.dateFilter() === '12h' ? 12 : 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    articles = articles.filter(a => new Date(a.publishedAt) >= cutoff);

    return [...articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });

  /** Most recent created_at across all cached articles — shows when cache was last populated. */
  cacheTime = computed(() => {
    const times = this.allArticles()
      .filter(a => a.cachedAt)
      .map(a => new Date(a.cachedAt!).getTime());
    return times.length ? new Date(Math.max(...times)) : null;
  });

  constructor(
    private newsService: NewsService,
    private stockService: StockService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.buildSymbolNameMap();
    this.loadFromCache();
  }

  /**
   * Build a symbol → company name map from the cached watchlist.
   * Used to show readable labels instead of raw numeric codes for KLSE stocks.
   */
  private buildSymbolNameMap(): void {
    const cached = this.stockService.getCachedWatchlist();
    if (cached) {
      cached.forEach(s => this.symbolNameMap.set(s.symbol, s.companyName));
      return;
    }
    // Watchlist not yet cached — fetch it quietly
    this.stockService.getWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stocks) => stocks.forEach(s => this.symbolNameMap.set(s.symbol, s.companyName)),
        error: () => {} // Non-critical — labels fall back to raw symbol
      });
  }

  /**
   * Return a human-readable label for a symbol.
   * For KLSE numeric codes (e.g. "1155"), returns the company name ("Maybank").
   * For readable ticker symbols (AAPL), returns the symbol as-is.
   */
  symbolLabel(symbol: string): string {
    return this.symbolNameMap.get(symbol) || symbol;
  }

  loadFromCache(): void {
    this.isLoadingCache.set(true);
    this.newsService.getCachedWatchlistNews()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.processNewsData(data);
          this.isLoadingCache.set(false);
        },
        error: () => {
          this.isLoadingCache.set(false);
        }
      });
  }

  fetchNews(): void {
    this.isLoadingFresh.set(true);
    this.newsService.getNewsForWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.processNewsData(data);
          this.lastFetchedAt.set(new Date());
          this.isLoadingFresh.set(false);
        },
        error: () => {
          this.isLoadingFresh.set(false);
        }
      });
  }

  private processNewsData(data: WatchlistNewsData): void {
    const flat: FlatNewsItem[] = [];
    const syms = Object.keys(data.symbols);
    this.symbols.set(syms);
    syms.forEach(sym => {
      (data.symbols[sym] || []).forEach(article => {
        flat.push({ ...article, symbol: sym });
      });
    });
    this.allArticles.set(flat);
  }

  formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'recently';
    }
  }

  openNews(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  openPromptDialog(): void {
    const articles = this.filteredArticles().map(a => ({
      symbol: a.symbol,
      headline: a.headline,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt
    }));

    this.dialog.open(NewsPromptDialogComponent, {
      data: { articles },
      width: '680px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'news-prompt-dialog'
    });
  }
}
