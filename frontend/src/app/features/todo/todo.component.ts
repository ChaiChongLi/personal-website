import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TodoService, Todo, TodoStats } from '../../core/services/todo.service';
import {
  TodoDetailDialogComponent,
  TodoDialogResult
} from './todo-detail-dialog/todo-detail-dialog.component';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  todos = signal<Todo[]>([]);
  stats = signal<TodoStats | null>(null);
  isLoading = signal(false);

  newTodoForm!: FormGroup;
  showAddForm = signal(false);

  constructor(
    private todoService: TodoService,
    private formBuilder: FormBuilder,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadTodos();
    this.loadStats();
  }

  private getOneWeekFromNow(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD for date input
  }

  private initializeForm(): void {
    this.newTodoForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', Validators.required],
      dueDate: [this.getOneWeekFromNow()]
    });
  }

  private loadTodos(): void {
    this.isLoading.set(true);
    this.todoService.getTodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (todos) => {
          this.todos.set(todos);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  private loadStats(): void {
    this.todoService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: () => {}
      });
  }

  addTodo(): void {
    if (this.newTodoForm.invalid) return;

    const formValue = this.newTodoForm.value;
    this.todoService.createTodo({
      title: formValue.title,
      description: formValue.description || undefined,
      priority: formValue.priority,
      status: 'pending',
      dueDate: formValue.dueDate || undefined
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (newTodo) => {
        this.todos.update(todos => [...todos, newTodo]);
        this.newTodoForm.reset({ priority: 'medium', dueDate: this.getOneWeekFromNow() });
        this.showAddForm.set(false);
        this.loadStats();
      },
      error: (error) => console.error('Error creating todo:', error)
    });
  }

  openDetailDialog(todo: Todo): void {
    const dialogRef = this.dialog.open(TodoDetailDialogComponent, {
      data: { todo },
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'todo-detail-dialog'
    });

    dialogRef.afterClosed().subscribe((result: TodoDialogResult | undefined) => {
      if (!result) return;

      if (result.action === 'delete') {
        this.todoService.deleteTodo(todo.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.todos.update(todos => todos.filter(t => t.id !== todo.id));
              this.loadStats();
            }
          });
      } else if (result.action === 'save' && result.updates) {
        this.todoService.updateTodo(todo.id, result.updates)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.todos.update(todos =>
                todos.map(t => t.id === todo.id ? { ...t, ...result.updates } : t)
              );
              this.loadStats();
            }
          });
      }
    });
  }

  updateTodoStatus(todo: Todo, newStatus: 'pending' | 'in-progress' | 'done'): void {
    this.todoService.updateTodo(todo.id, { status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.todos.update(todos =>
            todos.map(t => t.id === todo.id ? { ...t, status: newStatus } : t)
          );
          this.loadStats();
        },
        error: (error) => console.error('Error updating todo:', error)
      });
  }

  deleteTodo(todo: Todo, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Delete "${todo.title}"?`)) {
      this.todoService.deleteTodo(todo.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.todos.update(todos => todos.filter(t => t.id !== todo.id));
            this.loadStats();
          },
          error: (error) => console.error('Error deleting todo:', error)
        });
    }
  }

  getTodosByStatus(status: 'pending' | 'in-progress' | 'done'): Todo[] {
    return this.todos().filter(t => t.status === status);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  isOverdue(todo: Todo): boolean {
    if (!todo.dueDate || todo.status === 'done') return false;
    return new Date(todo.dueDate) < new Date();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-primary';
      default: return 'badge-secondary';
    }
  }

  get title() { return this.newTodoForm.get('title'); }
}
