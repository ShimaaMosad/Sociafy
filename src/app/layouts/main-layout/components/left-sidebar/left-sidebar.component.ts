import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { NotificationsService } from '../../../../features/notifications/services/notifications.service';
import { User } from '../../../../features/auth/models/auth-response.interface';
import { AuthService } from '../../../../features/auth/services/auth.service';

@Component({
  selector: 'app-left-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './left-sidebar.component.html',
  styleUrl: './left-sidebar.component.css',
})
export class LeftSidebarComponent implements OnInit, OnDestroy {
  private notificationsService = inject(NotificationsService);
  private currentUserService = inject(CurrentUserService);
  private unreadSub?: Subscription;
  private authService = inject(AuthService);

  unreadNotificationsCount: number = 0;
  currentUser: User | null = null;

  ngOnInit(): void {
    this.unreadSub = this.notificationsService.unreadCount$.subscribe((count) => {
      this.unreadNotificationsCount = count;
    });
    this.fetchUnreadCount();
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  fetchUnreadCount() {
    this.notificationsService.getUnreadCount().subscribe({
      error: (err) => {
        console.error('Error fetching unread notifications count:', err);
      },
    });
  }

  loadCurrentUser() {
    this.currentUser = this.currentUserService.getCurrentUser();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
