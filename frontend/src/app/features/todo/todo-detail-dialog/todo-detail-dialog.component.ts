import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Todo } from '../../../core/services/todo.service';

export interface TodoDialogData {
  todo: Todo;
}

export interface TodoDialogResult {
  action: 'save' | 'delete';
  updates?: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'status' | 'dueDate'>>;
}

@Component({
  selector: 'app-todo-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './todo-detail-dialog.component.html',
  styleUrls: ['./todo-detail-dialog.component.scss']
})
export class TodoDetailDialogComponent {
  todo: Todo;
  isEditing = false;
  editForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<TodoDetailDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: TodoDialogData,
    private fb: FormBuilder
  ) {
    this.todo = data.todo;
    this.editForm = this.fb.group({
      title: [this.todo.title, [Validators.required, Validators.minLength(3)]],
      description: [this.todo.description || ''],
      priority: [this.todo.priority, Validators.required],
      status: [this.todo.status, Validators.required],
      dueDate: [this.todo.dueDate ? this.todo.dueDate.split('T')[0] : '']
    });
  }

  startEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm.patchValue({
      title: this.todo.title,
      description: this.todo.description || '',
      priority: this.todo.priority,
      status: this.todo.status,
      dueDate: this.todo.dueDate ? this.todo.dueDate.split('T')[0] : ''
    });
  }

  save(): void {
    if (this.editForm.invalid) return;
    const v = this.editForm.value;
    const result: TodoDialogResult = {
      action: 'save',
      updates: {
        title: v.title,
        description: v.description || undefined,
        priority: v.priority,
        status: v.status,
        dueDate: v.dueDate || undefined
      }
    };
    this.dialogRef.close(result);
  }

  confirmDelete(): void {
    this.dialogRef.close({ action: 'delete' } as TodoDialogResult);
  }

  close(): void {
    this.dialogRef.close();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-primary';
      default: return 'badge-secondary';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'No due date set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  isOverdue(): boolean {
    if (!this.todo.dueDate || this.todo.status === 'done') return false;
    return new Date(this.todo.dueDate) < new Date();
  }

  get statusLabel(): string {
    return this.todo.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  get titleControl() { return this.editForm.get('title'); }
}
