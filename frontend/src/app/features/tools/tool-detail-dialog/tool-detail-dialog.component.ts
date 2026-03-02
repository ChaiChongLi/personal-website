import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Tool } from '../../../core/services/tool.service';

@Component({
  selector: 'app-tool-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './tool-detail-dialog.component.html',
  styleUrls: ['./tool-detail-dialog.component.scss']
})
export class ToolDetailDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ToolDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public tool: Tool
  ) {}

  openUrl(): void {
    window.open(this.tool.githubUrl, '_blank', 'noopener,noreferrer');
  }

  onEdit(): void {
    this.dialogRef.close('edit');
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'GitHub':     return 'code';
      case 'Tools':      return 'build';
      case 'Article':    return 'article';
      case 'Useful URL': return 'link';
      default:           return 'bookmark';
    }
  }
}
