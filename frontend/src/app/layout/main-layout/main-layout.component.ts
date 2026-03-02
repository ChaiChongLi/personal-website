import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { RouterOutlet, RouterLink } from '@angular/router';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';

/**
 * Main layout component providing application structure
 * Contains sidenav, toolbar, and router outlet for page content
 * Responsive design: sidebar auto-hidden on mobile
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    RouterOutlet,
    RouterLink,
    MatDividerModule,
    SidebarComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  // Track if sidebar should be opened on mobile
  sidenavOpened = signal(false);

  // Track if we're on mobile
  isHandset = signal(false);

  constructor(
    private breakpointObserver: BreakpointObserver,
    protected authService: AuthService
  ) {}

  ngOnInit(): void {
    // Observe breakpoint changes for responsive sidebar
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe((state: BreakpointState) => {
        this.isHandset.set(state.matches);
      });
  }

  /**
   * Toggle sidebar visibility on mobile
   */
  toggleSidebar(): void {
    this.sidenavOpened.update((value) => !value);
  }

  /**
   * Close sidebar when navigation occurs on mobile
   */
  onSidenavNavigate(): void {
    if (this.isHandset()) {
      this.sidenavOpened.set(false);
    }
  }

  /**
   * Get display name for current user
   */
  getUserDisplayName(): string {
    const user = this.authService.getUser();
    return user?.username || 'User';
  }

  /**
   * Handle logout action
   */
  logout(): void {
    this.authService.logout();
  }
}
