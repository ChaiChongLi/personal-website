import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Login component for user authentication
 * Provides form-based login with username/password and optional remember-me checkbox
 * Implements proper error handling and loading states
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  // Form group for login
  loginForm!: FormGroup;

  // Track password visibility toggle
  hidePassword = true;

  // Error message from login attempt
  errorMessage = '';

  // Return URL after successful login
  returnUrl = '/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initialize form with validation
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    // Get return URL from route parameters — validate it is an internal relative path
    const rawReturnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.returnUrl = this.isSafeReturnUrl(rawReturnUrl) ? rawReturnUrl : '/dashboard';

    // Pre-fill email if remember-me was previously checked
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    if (rememberMe) {
      const lastEmail = localStorage.getItem('lastEmail');
      this.loginForm.patchValue({ email: lastEmail || '', rememberMe: true });
    }

    // Clear any previous error messages
    this.errorMessage = '';
  }

  /**
   * Validate that a returnUrl is a safe internal relative path.
   * Prevents open-redirect attacks where an attacker passes an external URL.
   */
  private isSafeReturnUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Handle form submission
   * Calls auth service to login and navigates on success
   */
  onSubmit(): void {
    // Validate form before submission
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    const { email, password, rememberMe } = this.loginForm.value;

    // Call auth service to login
    this.authService.login(email, password).subscribe({
      next: (response) => {
        // Store remember-me preference if checked
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('lastEmail', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('lastEmail');
        }

        // Navigate to return URL or dashboard (token is already stored by auth service tap())
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        // Handle login errors
        console.error('Login error:', error);

        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            this.errorMessage = 'Invalid email or password';
          } else if (error.status === 0) {
            this.errorMessage = 'Unable to connect to server. Please check your connection.';
          } else {
            this.errorMessage = error.error?.message || 'Login failed. Please try again.';
          }
        } else {
          this.errorMessage = 'An unexpected error occurred. Please try again.';
        }

        // Clear password field for security
        this.loginForm.patchValue({ password: '' });
      }
    });
  }

  /**
   * Handle Enter key press in form fields
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.loginForm.valid) {
      this.onSubmit();
    }
  }

  /**
   * Check if login is currently in progress
   */
  get isLoading(): boolean {
    return this.authService.isLoading();
  }

  /**
   * Get specific form control for validation display
   */
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  /**
   * Check if form can be submitted
   */
  get canSubmit(): boolean {
    return this.loginForm.valid && !this.isLoading;
  }
}
