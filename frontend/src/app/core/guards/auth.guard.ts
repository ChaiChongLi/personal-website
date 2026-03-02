import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that protects authenticated routes.
 * Redirects unauthenticated users to the login page.
 *
 * @param route - The route being activated
 * @param state - The router state
 * @returns true if user is authenticated, false otherwise (with redirect)
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    return true;
  }

  // Store attempted URL for redirect after successful login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
