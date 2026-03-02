import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface NewsPromptDialogData {
  articles: Array<{
    symbol: string;
    headline: string;
    url: string;
    source: string;
    publishedAt: string;
  }>;
}

@Component({
  selector: 'app-news-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="prompt-dialog">
      <div class="dialog-header">
        <div class="header-left">
          <mat-icon>auto_awesome</mat-icon>
          <h2>AI Summarisation Prompt</h2>
        </div>
        <div class="header-right">
          <span class="article-count">{{ data.articles.length }} articles</span>
          <button mat-icon-button (click)="dialogRef.close()" matTooltip="Close">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content>
        <p class="hint">Copy this prompt and paste it into any AI assistant to get a summary.</p>
        <textarea
          class="prompt-textarea"
          [value]="promptText"
          readonly
          (click)="$any($event.target).select()"
          spellcheck="false"
        ></textarea>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Close</button>
        <button
          mat-raised-button
          color="primary"
          (click)="copyToClipboard()"
          class="copy-btn"
        >
          <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
          {{ copied() ? 'Copied!' : 'Copy Prompt' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    ::ng-deep .news-prompt-dialog .mdc-dialog__surface {
      background-color: var(--bg-card) !important;
      border: 1px solid var(--border) !important;
      border-radius: 8px !important;
    }

    .prompt-dialog {
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem 0;

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.625rem;

          mat-icon { color: var(--accent); }

          h2 {
            margin: 0;
            font-size: 1.0625rem;
            font-weight: 600;
            color: var(--text-primary);
          }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .article-count {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            background-color: var(--bg-secondary);
            padding: 0.2rem 0.6rem;
            border-radius: 999px;
          }

          button { color: var(--text-secondary); }
        }
      }
    }

    mat-dialog-content {
      padding: 1rem 1.5rem !important;
      max-height: 65vh;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;

      .hint {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }

      .prompt-textarea {
        flex: 1;
        width: 100%;
        min-height: 340px;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 1rem;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 0.8125rem;
        line-height: 1.6;
        resize: vertical;
        outline: none;
        box-sizing: border-box;

        &:focus {
          border-color: var(--accent);
        }
      }
    }

    ::ng-deep mat-dialog-actions {
      padding: 0.75rem 1.5rem 1.25rem !important;
      border-top: 1px solid var(--border);
      gap: 0.75rem;

      .copy-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        min-width: 130px;
      }
    }
  `]
})
export class NewsPromptDialogComponent {
  copied = signal(false);
  promptText: string;

  constructor(
    public dialogRef: MatDialogRef<NewsPromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NewsPromptDialogData
  ) {
    this.promptText = this.buildPrompt(data.articles);
  }

  private buildPrompt(articles: NewsPromptDialogData['articles']): string {
    const lines: string[] = [
      'Please summarise the following news articles. For each article, provide a 1-2 sentence summary. Group by stock symbol.',
      '',
      `Articles (${articles.length} total):`,
      ''
    ];

    articles.forEach((a, i) => {
      lines.push(`${i + 1}. [${a.symbol}] ${a.headline}`);
      lines.push(`   Source: ${a.source}`);
      lines.push(`   URL: ${a.url}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.promptText).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }
}
