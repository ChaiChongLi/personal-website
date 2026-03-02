import { Component, OnInit, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TechFeedService, TechFeedItem } from '../../core/services/tech-feed.service';

@Component({
  selector: 'app-tech-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './tech-feed.component.html',
  styleUrls: ['./tech-feed.component.scss']
})
export class TechFeedComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  isLoadingCache = signal(false);
  isLoadingFresh = signal(false);
  allItems       = signal<TechFeedItem[]>([]);
  selectedSource = signal<string>('All');
  lastFetchedAt  = signal<Date | null>(null);

  filteredItems = computed(() => {
    const source = this.selectedSource();
    const items  = this.allItems();
    return source === 'All' ? items : items.filter(i => i.source === source);
  });

  cacheTime = computed(() => {
    const times = this.allItems()
      .filter(i => i.cachedAt)
      .map(i => new Date(i.cachedAt).getTime());
    return times.length ? new Date(Math.max(...times)) : null;
  });

  constructor(private techFeedService: TechFeedService) {}

  ngOnInit(): void {
    this.loadFromCache();
  }

  loadFromCache(): void {
    this.isLoadingCache.set(true);
    this.techFeedService.getCachedFeed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allItems.set(data.items);
          this.isLoadingCache.set(false);
        },
        error: () => this.isLoadingCache.set(false)
      });
  }

  fetchFresh(): void {
    this.isLoadingFresh.set(true);
    this.techFeedService.fetchFreshFeed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allItems.set(data.items);
          this.lastFetchedAt.set(new Date());
          this.isLoadingFresh.set(false);
        },
        error: () => this.isLoadingFresh.set(false)
      });
  }

  sourceLabel(source: string): string {
    const labels: Record<string, string> = {
      hackernews: 'HN',
      devto: 'Dev.to',
      github: 'GitHub'
    };
    return labels[source] ?? source;
  }

  sourceIcon(source: string): string {
    const icons: Record<string, string> = {
      hackernews: 'whatshot',
      devto: 'article',
      github: 'code'
    };
    return icons[source] ?? 'feed';
  }

  formatScore(item: TechFeedItem): string {
    if (!item.score) return '';
    if (item.score >= 1000) {
      return `⭐ ${(item.score / 1000).toFixed(1)}k`;
    }
    if (item.source === 'github') return `⭐ ${item.score}`;
    return `⬆ ${item.score}`;
  }

  formatRelativeTime(dateString: string | null): string {
    if (!dateString) return '';
    try {
      const diffMs   = Date.now() - new Date(dateString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1)  return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch { return ''; }
  }

  openLink(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
