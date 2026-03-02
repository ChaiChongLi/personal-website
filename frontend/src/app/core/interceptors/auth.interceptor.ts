import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,        // Angular 19 functional interceptor type
  HttpEvent,
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Functional HTTP interceptor for authentication (Angular 19 style).
 *
 * Responsibilities:
 *  1. Attach "Authorization: Bearer <token>" header to every outgoing request.
 *  2. On a 401 response, silently attempt a token refresh and retry once.
 *  3. On refresh failure, log the user out and redirect to /login.
 *
 * NOTE: In Angular 17+ functional interceptors, `next` is HttpHandlerFn —
 * a plain function (req) => Observable<...>, NOT the class-based HttpHandler.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Attach token to request if one is available
  const token = authService.getAccessToken();
  const authenticatedReq = token ? addTokenToRequest(req, token) : req;

  return next(authenticatedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only attempt refresh on 401 and only for non-refresh endpoints
      // to avoid infinite refresh loops
      if (error.status === 401 && !isRefreshRequest(req)) {
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Clone the request and add the Authorization Bearer header.
 */
function addTokenToRequest(
  request: HttpRequest<unknown>,
  token: string
): HttpRequest<unknown> {
  return request.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Returns true if the request is the token-refresh endpoint itself,
 * preventing an infinite loop of 401 → refresh → 401 → refresh …
 */
function isRefreshRequest(request: HttpRequest<unknown>): boolean {
  return request.url.includes('/auth/refresh');
}

/**
 * Handle 401 by refreshing the access token, then retrying the
 * original request once with the new token.
 *
 * @param request  - The original failed request
 * @param next     - HttpHandlerFn (callable function, NOT HttpHandler)
 * @param authService
 * @param router
 */
function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,             // ← correct type for functional interceptors
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  return authService.refreshToken().pipe(
    switchMap((response: any) => {
      // Backend wraps payload in response.data
      return next(addTokenToRequest(request, response.data.accessToken));
    }),
    catchError((refreshError: unknown) => {
      // Refresh itself failed — clear session and go to login
      authService.logout();
      router.navigate(['/login']);
      return throwError(() => refreshError);
    })
  );
}
