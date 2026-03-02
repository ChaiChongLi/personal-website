import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../core/services/auth.service';

/**
 * Navigation item definition
 */
interface NavItem {
  label: string;
  route: string;
  icon: string;
}

/**
 * Sidebar navigation component
 * Displays main navigation menu with animated active state
 * Emits navigation event for parent layout to handle responsive behavior
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatListModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();

  // Navigation items configuration
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Stocks', route: '/stocks', icon: 'trending_up' },
    { label: 'News', route: '/news', icon: 'newspaper' },
    { label: 'To-Do', route: '/todo', icon: 'check_circle' },
    { label: 'Tools', route: '/tools', icon: 'build' },
    { label: 'Resume', route: '/resume', icon: 'description' }
  ];

  constructor(protected authService: AuthService) {}

  /**
   * Get current user's display name
   */
  getUserDisplayName(): string {
    const user = this.authService.getUser();
    return user?.username || 'User';
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    const user = this.authService.getUser();
    if (!user) return 'U';

    return user.username
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Emit navigation event to parent layout
   */
  onNavigate(): void {
    this.navigate.emit();
  }
}
