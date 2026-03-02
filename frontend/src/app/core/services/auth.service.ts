import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * User interface representing authenticated user data
 */
export interface User {
  id: string;
  username: string;
  email: string;
}

/**
 * Authentication response interface
 */
interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

/**
 * Authentication service handling user login, logout, and token management
 * Uses Angular signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Current user signal
  currentUser = signal<User | null>(null);

  // Loading state signal
  isLoading = signal(false);

  // Token storage keys
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  // Token expiration time (in milliseconds)
  private readonly TOKEN_EXPIRATION_TIME = 3600000; // 1 hour

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Restore user from localStorage on service initialization
    this.restoreUserSession();
  }

  /**
   * Restore user session from localStorage if token is still valid
   */
  private restoreUserSession(): void {
    const token = this.getAccessToken();
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson && !this.isTokenExpired(token)) {
      try {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
      } catch (error) {
        console.error('Failed to restore user session:', error);
        this.logout();
      }
    } else if (token) {
      // Token exists but might be expired
      this.logout();
    }
  }

  /**
   * Check if user is authenticated
   * Verifies that token exists and is not expired
   *
   * @returns true if user is authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }

  /**
   * Login with username and password
   * Stores tokens and user data in localStorage
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Observable of authentication response
   */
  login(email: string, password: string): Observable<any> {
    this.isLoading.set(true);

    return this.http.post<any>(`${environment.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap((response: { data: any; }) => {
        // Backend wraps payload in response.data
        const data = response.data;
        localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
        }
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
        this.currentUser.set(data.user);
        this.isLoading.set(false);
      }),
      catchError((error: unknown) => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Register a new user account
   * Stores access token and user data on success, then the caller can navigate.
   */
  register(username: string, email: string, password: string): Observable<any> {
    this.isLoading.set(true);

    return this.http.post<any>(`${environment.apiUrl}/auth/register`, {
      username,
      email,
      password
    }).pipe(
      tap((response: { data: any; }) => {
        const data = response.data;
        localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
        }
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
        this.currentUser.set(data.user);
        this.isLoading.set(false);
      }),
      catchError((error: unknown) => {
        this.isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Logout user by clearing localStorage and resetting state
   * Navigates to login page
   */
  logout(): void {
    // Clear all stored data
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    // Reset state
    this.currentUser.set(null);

    // Navigate to login
    this.router.navigate(['/login']);
  }

  /**
   * Refresh access token using refresh token
   * Updates stored tokens on success
   *
   * @returns Observable of authentication response with new access token
   */
  refreshToken(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/refresh`, {}, {
      withCredentials: true  // send the httpOnly refreshToken cookie
    }).pipe(
      tap((response) => {
        const data = response.data;
        localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
        }
      })
    );
  }

  /**
   * Get the current access token from localStorage
   *
   * @returns Access token string or null if not found
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get the current user object
   *
   * @returns Current user or null if not authenticated
   */
  getUser(): User | null {
    return this.currentUser();
  }

  /**
   * Decode JWT token to extract payload (without verification)
   * WARNING: This is for client-side use only. Never trust this for security decisions.
   *
   * @param token - JWT token to decode
   * @returns Decoded payload object
   */
  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * Compares token's exp claim with current time
   *
   * @param token - JWT token to check
   * @returns true if token is expired, false otherwise
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      // Convert exp (seconds) to milliseconds and compare with current time
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();

      // Consider token expired if it will expire in the next 5 minutes
      return expirationTime - currentTime < 300000;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}
