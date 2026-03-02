import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/**
 * Global Angular application configuration
 * Provides routing, HTTP client with interceptors, animations, and zone optimization
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Zone optimization for better performance with frequent change detection
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router with view transition animations
    provideRouter(routes, withViewTransitions()),

    // HTTP client with auth interceptor
    provideHttpClient(withInterceptors([authInterceptor])),

    // Angular Material and form animations
    provideAnimations()
  ]
};
