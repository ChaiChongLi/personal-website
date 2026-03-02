import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Add stock dialog component
 * Provides form for adding new stocks to watchlist
 */
@Component({
  selector: 'app-add-stock-dialog',
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
  templateUrl: './add-stock-dialog.component.html',
  styleUrls: ['./add-stock-dialog.component.scss']
})
export class AddStockDialogComponent implements OnInit {
  // Form for adding stock
  addStockForm!: FormGroup;

  // Exchange options (Google Finance exchange codes)
  marketOptions = [
    { value: 'KLSE',   label: 'KLSE — Bursa Malaysia (MYR)' },
    { value: 'NASDAQ', label: 'NASDAQ — US Tech (USD)' },
    { value: 'NYSE',   label: 'NYSE — US Blue-chip (USD)' },
    { value: 'SGX',    label: 'SGX — Singapore (SGD)' },
    { value: 'HKEX',  label: 'HKEX — Hong Kong (HKD)' },
    { value: 'CRYPTO', label: 'CRYPTO — Cryptocurrency (USD)' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private dialogRef: MatDialogRef<AddStockDialogComponent>
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize form with validation
   */
  private initializeForm(): void {
    this.addStockForm = this.formBuilder.group({
      symbol: ['', [Validators.required, Validators.pattern(/^[A-Z0-9.\-]+$/)]],
      market: ['KLSE', Validators.required],
      companyName: ['', Validators.required],
      notes: ['']
    });
  }

  /**
   * Convert symbol to uppercase automatically
   */
  onSymbolChange(): void {
    const symbolControl = this.addStockForm.get('symbol');
    if (symbolControl) {
      symbolControl.setValue(symbolControl.value?.toUpperCase(), { emitEvent: false });
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.addStockForm.invalid) {
      return;
    }

    const formData = this.addStockForm.value;

    // Convert empty notes to undefined
    if (!formData.notes) {
      delete formData.notes;
    }

    this.dialogRef.close(formData);
  }

  /**
   * Close dialog without adding stock
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Get form control for validation display
   */
  get symbol() {
    return this.addStockForm.get('symbol');
  }

  get market() {
    return this.addStockForm.get('market');
  }

  get companyName() {
    return this.addStockForm.get('companyName');
  }

  /**
   * Check if form is valid
   */
  get isFormValid(): boolean {
    return this.addStockForm.valid;
  }
}
