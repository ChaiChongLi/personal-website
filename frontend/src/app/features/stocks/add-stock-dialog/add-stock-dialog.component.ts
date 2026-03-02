import { Component, OnInit, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StockItem } from '../../../core/services/stock.service';

export interface StockDialogData {
  stock: StockItem;
}

/**
 * Add / Edit stock dialog component.
 * - No MAT_DIALOG_DATA injected → Add mode
 * - MAT_DIALOG_DATA with { stock } injected → Edit mode (form pre-filled)
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
  stockForm!: FormGroup;
  isEditMode: boolean;

  marketOptions = [
    { value: 'KLSE',   label: 'KLSE — Bursa Malaysia (MYR)' },
    { value: 'NASDAQ', label: 'NASDAQ — US Tech (USD)' },
    { value: 'NYSE',   label: 'NYSE — US Blue-chip (USD)' },
    { value: 'SGX',    label: 'SGX — Singapore (SGD)' },
    { value: 'HKEX',   label: 'HKEX — Hong Kong (HKD)' },
    { value: 'CRYPTO', label: 'CRYPTO — Cryptocurrency (USD)' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private dialogRef: MatDialogRef<AddStockDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: StockDialogData | null
  ) {
    this.isEditMode = !!data?.stock;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const stock = this.data?.stock;
    this.stockForm = this.formBuilder.group({
      symbol:      [stock?.symbol      ?? '',     [Validators.required, Validators.pattern(/^[A-Z0-9.\-]+$/)]],
      market:      [stock?.market      ?? 'KLSE', Validators.required],
      companyName: [stock?.companyName ?? '',     Validators.required],
      notes:       [stock?.notes       ?? '']
    });
  }

  onSymbolChange(): void {
    const ctrl = this.stockForm.get('symbol');
    if (ctrl) {
      ctrl.setValue(ctrl.value?.toUpperCase(), { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (this.stockForm.invalid) return;

    const formData = { ...this.stockForm.value };
    if (!formData.notes) formData.notes = '';

    this.dialogRef.close(formData);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get symbol()      { return this.stockForm.get('symbol'); }
  get market()      { return this.stockForm.get('market'); }
  get companyName() { return this.stockForm.get('companyName'); }
  get isFormValid() { return this.stockForm.valid; }
}
