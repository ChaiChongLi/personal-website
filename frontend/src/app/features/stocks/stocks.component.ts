import { Component, OnInit, OnDestroy, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StockService, StockItem } from '../../core/services/stock.service';
import { AddStockDialogComponent, StockDialogData } from './add-stock-dialog/add-stock-dialog.component';

/**
 * Stocks watchlist component
 * Displays table of watched stocks with real-time price updates
 * Auto-refreshes every 60 seconds
 */
@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.scss']
})
export class StocksComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  // Table column definitions
  // KLSE stocks show volume, dy, pe, nta from KLSE Screener.
  // Other markets show — for those columns (Google Finance doesn't provide them).
  displayedColumns: string[] = ['symbol', 'company', 'market', 'price', 'change', 'changePercent', 'volume', 'dy', 'pe', 'nta', 'actions'];

  // Data signals
  stocks = signal<StockItem[]>([]);
  isLoading = signal(false);
  isRefreshing = signal(false);
  selectedStocks = signal<Set<string>>(new Set());

  // Auto-refresh interval
  private refreshInterval: any;

  constructor(
    private stockService: StockService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadStocks();

    // Set up auto-refresh every 60 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshPrices();
    }, 60000);
  }

  ngOnDestroy(): void {
    // Clean up interval on component destroy
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Load stocks from service
   */
  private loadStocks(): void {
    this.isLoading.set(true);

    this.stockService.getWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stocks) => {
          this.stocks.set(stocks);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading stocks:', error);
          this.isLoading.set(false);
        }
      });
  }

  /**
   * Refresh stock prices
   */
  refreshPrices(): void {
    this.isRefreshing.set(true);

    this.stockService.refreshPrices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stocks) => {
          this.stocks.set(stocks);
          this.isRefreshing.set(false);
        },
        error: (error) => {
          console.error('Error refreshing prices:', error);
          this.isRefreshing.set(false);
        }
      });
  }

  /**
   * Open add stock dialog
   */
  openAddStockDialog(): void {
    const dialogRef = this.dialog.open(AddStockDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
      panelClass: 'add-stock-dialog'
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.stockService.addStock(result.symbol, result.market, result.companyName, result.notes)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => { this.loadStocks(); },
              error: (error) => { console.error('Error adding stock:', error); }
            });
        }
      });
  }

  /**
   * Open edit stock dialog pre-filled with existing stock data
   */
  openEditStockDialog(stock: StockItem): void {
    const dialogRef = this.dialog.open(AddStockDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
      panelClass: 'add-stock-dialog',
      data: { stock } satisfies StockDialogData
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.stockService.updateStock(stock.id, {
            symbol:      result.symbol,
            market:      result.market,
            companyName: result.companyName,
            notes:       result.notes
          })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => { this.loadStocks(); },
              error: (error) => { console.error('Error updating stock:', error); }
            });
        }
      });
  }

  /**
   * Delete stock from watchlist
   */
  deleteStock(stock: StockItem): void {
    if (confirm(`Are you sure you want to remove ${stock.symbol} from your watchlist?`)) {
      this.stockService.deleteStock(stock.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.stocks.set(this.stocks().filter((s) => s.id !== stock.id));
          },
          error: (error) => {
            console.error('Error deleting stock:', error);
          }
        });
    }
  }

  /**
   * Get CSS class for price change
   */
  getPriceChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }

  /**
   * Display a pre-formatted string stat, or '—' if null.
   * KLSE Screener returns these already formatted (e.g. "1,234,500", "RM 2.34B").
   */
  formatStat(value: string | null): string {
    return value ?? '—';
  }

  /**
   * Infer currency ISO code from exchange
   */
  private getCurrencyForMarket(market: string): string {
    switch (market) {
      case 'NASDAQ': case 'NYSE': case 'US': case 'CRYPTO': return 'USD';
      case 'SGX': case 'SG': return 'SGD';
      case 'HKEX': return 'HKD';
      case 'KLSE': case 'MY': default: return 'MYR';
    }
  }

  /**
   * Format currency based on the stock's exchange
   */
  formatCurrency(value: number | null, market?: string): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.getCurrencyForMarket(market ?? ''),
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }

  /**
   * Get market badge color by exchange code
   */
  getMarketColor(market: string): string {
    switch (market) {
      case 'KLSE': case 'MY': return 'badge-primary';
      case 'NASDAQ': case 'NYSE': case 'US': return 'badge-success';
      case 'SGX': case 'SG': return 'badge-warning';
      case 'HKEX': return 'badge-danger';
      case 'CRYPTO': return 'badge-crypto';
      default: return 'badge-secondary';
    }
  }

  /**
   * Get last updated time
   */
  getLastUpdated(): string {
    const lastUpdated = this.stockService.lastUpdated();
    if (!lastUpdated) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  /**
   * Toggle stock selection
   */
  toggleSelection(stock: StockItem): void {
    const selected = new Set(this.selectedStocks());
    if (selected.has(stock.id)) {
      selected.delete(stock.id);
    } else {
      selected.add(stock.id);
    }
    this.selectedStocks.set(selected);
  }

  /**
   * Check if stock is selected
   */
  isSelected(stock: StockItem): boolean {
    return this.selectedStocks().has(stock.id);
  }
}
