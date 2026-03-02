import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/**
 * Application routing configuration
 * Implements lazy-loaded components with authentication guards
 */
export const routes: Routes = [
  // Root redirect
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Login route (public, no layout)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },

  // Register route (public, no layout)
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  // Protected routes with main layout
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'stocks',
        loadComponent: () => import('./features/stocks/stocks.component').then(m => m.StocksComponent)
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news.component').then(m => m.NewsComponent)
      },
      {
        path: 'todo',
        loadComponent: () => import('./features/todo/todo.component').then(m => m.TodoComponent)
      },
      {
        path: 'tools',
        loadComponent: () => import('./features/tools/tools.component').then(m => m.ToolsComponent)
      },
      {
        path: 'resume',
        loadComponent: () => import('./features/resume/resume.component').then(m => m.ResumeComponent)
      },
      {
        path: 'tech-feed',
        loadComponent: () => import('./features/tech-feed/tech-feed.component').then(m => m.TechFeedComponent)
      }
    ]
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '/dashboard' }
];
