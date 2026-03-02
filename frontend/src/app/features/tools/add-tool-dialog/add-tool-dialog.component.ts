import { Component, OnInit, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Tool } from '../../../core/services/tool.service';

@Component({
  selector: 'app-add-tool-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './add-tool-dialog.component.html',
  styleUrls: ['./add-tool-dialog.component.scss']
})
export class AddToolDialogComponent implements OnInit {
  form!: FormGroup;
  isEditing = false;

  readonly categoryOptions = [
    { value: 'GitHub',     label: 'GitHub' },
    { value: 'Tools',      label: 'Tools' },
    { value: 'Article',    label: 'Article' },
    { value: 'Useful URL', label: 'Useful URL' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddToolDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { tool?: Tool } | null
  ) {}

  ngOnInit(): void {
    const tool = this.data?.tool;
    this.isEditing = !!tool;

    this.form = this.fb.group({
      name:        [tool?.name || '',        [Validators.required, Validators.minLength(2)]],
      category:    [tool?.category || '',    Validators.required],
      url:         [tool?.githubUrl || '',   [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      description: [tool?.description || '', Validators.required],
      tags:        [tool?.tags?.join(', ') || '']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const { name, category, url, description, tags } = this.form.value;

    this.dialogRef.close({
      name,
      category,
      githubUrl: url,
      description,
      tags: tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get name()        { return this.form.get('name'); }
  get category()    { return this.form.get('category'); }
  get url()         { return this.form.get('url'); }
  get description() { return this.form.get('description'); }
}
