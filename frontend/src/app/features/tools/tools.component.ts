import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToolService, Tool } from '../../core/services/tool.service';
import { AddToolDialogComponent } from './add-tool-dialog/add-tool-dialog.component';
import { ToolDetailDialogComponent } from './tool-detail-dialog/tool-detail-dialog.component';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.scss']
})
export class ToolsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  tools = signal<Tool[]>([]);
  filteredTools = signal<Tool[]>([]);
  isLoading = signal(false);

  searchQuery = signal('');
  selectedCategory = signal('all');

  readonly categoryOptions = ['GitHub', 'Tools', 'Article', 'Useful URL'];

  constructor(
    private toolService: ToolService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTools();
  }

  private loadTools(): void {
    this.isLoading.set(true);

    this.toolService.getTools()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tools) => {
          this.tools.set(tools);
          this.applyFilters();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading tools:', error);
          this.isLoading.set(false);
        }
      });
  }

  private applyFilters(): void {
    let filtered = this.tools();

    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(t => t.category === this.selectedCategory());
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    this.filteredTools.set(filtered);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.applyFilters();
  }

  onCategoryChange(value: string): void {
    this.selectedCategory.set(value);
    this.applyFilters();
  }

  // ── Dialogs ────────────────────────────────────────────────────────────────

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AddToolDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      panelClass: 'add-tool-dialog'
      // no data → add mode
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.toolService.createTool(result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (newTool) => {
              this.tools.update(tools => [newTool, ...tools]);
              this.applyFilters();
            },
            error: (error) => console.error('Error adding tool:', error)
          });
      });
  }

  openDetailDialog(tool: Tool): void {
    const dialogRef = this.dialog.open(ToolDetailDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      panelClass: 'tool-detail-dialog',
      data: tool
    });

    // If user clicks "Edit" inside the detail dialog, open edit dialog
    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (result === 'edit') {
          this.openEditDialog(tool);
        }
      });
  }

  openEditDialog(tool: Tool): void {
    const dialogRef = this.dialog.open(AddToolDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      panelClass: 'add-tool-dialog',
      data: { tool }   // triggers edit mode
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.toolService.updateTool(tool.id, result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (updated) => {
              this.tools.update(tools => tools.map(t => t.id === tool.id ? updated : t));
              this.applyFilters();
            },
            error: (error) => console.error('Error updating tool:', error)
          });
      });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  toggleFavorite(tool: Tool, event: Event): void {
    event.stopPropagation();
    this.toolService.toggleFavorite(tool.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ isFavorite }) => {
          this.tools.update(tools =>
            tools.map(t => t.id === tool.id ? { ...t, isFavorite } : t)
          );
          this.applyFilters();
        },
        error: (error) => console.error('Error toggling favorite:', error)
      });
  }

  deleteTool(tool: Tool, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${tool.name}"?`)) return;

    this.toolService.deleteTool(tool.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tools.update(tools => tools.filter(t => t.id !== tool.id));
          this.applyFilters();
        },
        error: (error) => console.error('Error deleting tool:', error)
      });
  }

  openUrl(url: string, event: Event): void {
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Styling helpers ────────────────────────────────────────────────────────

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'GitHub':     return 'code';
      case 'Tools':      return 'build';
      case 'Article':    return 'article';
      case 'Useful URL': return 'link';
      default:           return 'bookmark';
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'GitHub':     return 'badge-secondary';
      case 'Tools':      return 'badge-primary';
      case 'Article':    return 'badge-warning';
      case 'Useful URL': return 'badge-success';
      default:           return 'badge-secondary';
    }
  }
}
