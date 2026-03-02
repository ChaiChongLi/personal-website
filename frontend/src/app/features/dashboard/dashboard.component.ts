import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StockService, StockItem } from '../../core/services/stock.service';
import { TodoService, Todo, TodoStats } from '../../core/services/todo.service';
import { ToolService } from '../../core/services/tool.service';
import { NewsService, NewsItem } from '../../core/services/news.service';
import { TechFeedService, TechFeedItem } from '../../core/services/tech-feed.service';

interface DashboardNewsItem extends NewsItem {
  symbol: string;
}

const NEWS_PAGE_SIZE = 10;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // Loading states
  isLoadingStocks    = signal(false);
  isRefreshingStocks = signal(false);
  isLoadingTodos     = signal(false);
  isLoadingTools     = signal(false);
  isLoadingNews      = signal(false);
  isFetchingNews     = signal(false);

  // Data
  recentStocks = signal<StockItem[]>([]);
  todoStats    = signal<TodoStats | null>(null);
  activeTodos  = signal<Todo[]>([]);
  toolsCount   = signal(0);
  recentNews   = signal<DashboardNewsItem[]>([]);

  // Tech Feed
  isLoadingTechFeed = signal(false);
  recentTechFeed    = signal<TechFeedItem[]>([]);

  // News pagination
  displayedCount = signal(NEWS_PAGE_SIZE);
  displayedNews  = computed(() => this.recentNews().slice(0, this.displayedCount()));
  hasMoreNews    = computed(() => this.displayedCount() < this.recentNews().length);

  constructor(
    private stockService: StockService,
    private todoService: TodoService,
    private toolService: ToolService,
    private newsService: NewsService,
    private techFeedService: TechFeedService
  ) {}

  ngOnInit(): void {
    this.loadStocks();
    this.loadTodoStats();
    this.loadTools();
    this.loadNewsFromCache();
    this.loadTechFeedPreview();
  }

  // ── Stocks ─────────────────────────────────────────────────────────────────

  private loadStocks(): void {
    this.isLoadingStocks.set(true);
    this.stockService.getWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stocks) => { this.recentStocks.set(stocks); this.isLoadingStocks.set(false); },
        error: () => this.isLoadingStocks.set(false)
      });
  }

  refreshStockPrices(): void {
    this.isRefreshingStocks.set(true);
    this.stockService.refreshPrices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stocks) => { this.recentStocks.set(stocks); this.isRefreshingStocks.set(false); },
        error: () => this.isRefreshingStocks.set(false)
      });
  }

  // ── Todos ──────────────────────────────────────────────────────────────────

  private loadTodoStats(): void {
    this.isLoadingTodos.set(true);

    this.todoService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (stats) => this.todoStats.set(stats), error: () => {} });

    this.todoService.getTodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (todos) => {
          this.activeTodos.set(todos.filter(t => t.status !== 'done').slice(0, 10));
          this.isLoadingTodos.set(false);
        },
        error: () => this.isLoadingTodos.set(false)
      });
  }

  // ── Tools ──────────────────────────────────────────────────────────────────

  private loadTools(): void {
    this.isLoadingTools.set(true);
    this.toolService.getTools()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tools) => { this.toolsCount.set(tools.length); this.isLoadingTools.set(false); },
        error: () => this.isLoadingTools.set(false)
      });
  }

  // ── News ───────────────────────────────────────────────────────────────────

  /** On page open: read DB cache — no Google call. */
  private loadNewsFromCache(): void {
    this.isLoadingNews.set(true);
    this.newsService.getCachedWatchlistNews()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.setNewsData(data.symbols);
          this.isLoadingNews.set(false);
        },
        error: () => this.isLoadingNews.set(false)
      });
  }

  /** Button action: fetch fresh news from Google, update DB cache. */
  fetchLatestNews(): void {
    this.isFetchingNews.set(true);
    this.newsService.getNewsForWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.setNewsData(data.symbols);
          this.isFetchingNews.set(false);
        },
        error: () => this.isFetchingNews.set(false)
      });
  }

  loadMoreNews(): void {
    this.displayedCount.update(n => n + NEWS_PAGE_SIZE);
  }

  private setNewsData(symbols: Record<string, NewsItem[]>): void {
    const flat: DashboardNewsItem[] = [];
    Object.keys(symbols).forEach(sym =>
      (symbols[sym] || []).forEach(a => flat.push({ ...a, symbol: sym }))
    );
    flat.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    this.recentNews.set(flat);
    this.displayedCount.set(NEWS_PAGE_SIZE); // reset to first page on new data
  }

  // ── Tech Feed ───────────────────────────────────────────────────────────────

  private loadTechFeedPreview(): void {
    this.isLoadingTechFeed.set(true);
    this.techFeedService.getCachedFeed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.recentTechFeed.set(data.items.slice(0, 5));
          this.isLoadingTechFeed.set(false);
        },
        error: () => this.isLoadingTechFeed.set(false)
      });
  }

  techSourceLabel(source: string): string {
    const labels: Record<string, string> = { hackernews: 'HN', devto: 'Dev.to', github: 'GitHub' };
    return labels[source] ?? source;
  }

  // ── Formatting helpers ─────────────────────────────────────────────────────

  formatStockPrice(price: number | null, market: string): string {
    if (price === null || price === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.getCurrencyForMarket(market),
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(price);
  }

  private getCurrencyForMarket(market: string): string {
    switch (market) {
      case 'NASDAQ': case 'NYSE': case 'US': case 'CRYPTO': return 'USD';
      case 'SGX': case 'SG':                                return 'SGD';
      case 'HKEX':                                          return 'HKD';
      default:                                              return 'MYR';
    }
  }

  formatPriceChange(change: number | null): string {
    if (change === null || change === undefined) return '—';
    return change >= 0 ? `+${change.toFixed(2)}` : `${change.toFixed(2)}`;
  }

  formatPercentChange(percent: number | null): string {
    if (percent === null || percent === undefined) return '—';
    return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
  }

  getPriceChangeClass(change: number | null): string {
    if (change === null || change === undefined) return '';
    return change >= 0 ? 'text-success' : 'text-danger';
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':   return 'badge-danger';
      case 'medium': return 'badge-warning';
      case 'low':    return 'badge-primary';
      default:       return 'badge-secondary';
    }
  }

  getStatusClass(status: string): string {
    return status === 'in-progress' ? 'status-inprogress' : 'status-pending';
  }

  getStatusLabel(status: string): string {
    return status === 'in-progress' ? 'In Progress' : 'Pending';
  }

  isTodoOverdue(todo: Todo): boolean {
    if (!todo.dueDate || todo.status === 'done') return false;
    return new Date(todo.dueDate) < new Date();
  }

  formatShortDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatRelativeTime(dateString: string): string {
    try {
      const diffMs = Date.now() - new Date(dateString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1)  return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch { return 'recently'; }
  }

  openNews(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getTotalTodos(): number { return this.todoStats()?.total || 0; }
}
