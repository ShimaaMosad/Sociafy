import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../../../../features/notifications/services/notifications.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { User } from '../../../../features/auth/models/auth-response.interface';
import { AuthService } from '../../../../features/auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);

  private notificationsService = inject(NotificationsService);
  private currentUserService = inject(CurrentUserService);
  private unreadSub?: Subscription;

  unreadCount = 0;
  currentUser: User | null = null;

  ngOnInit(): void {
    this.loadCurrentUser();
    this.unreadSub = this.notificationsService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
    });
    this.fetchUnreadCount();
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  loadCurrentUser(): void {
    this.currentUser = this.currentUserService.getCurrentUser();
  }

  fetchUnreadCount(): void {
    this.notificationsService.getUnreadCount().subscribe({
      error: (err) => {
        console.error('Error fetching unread notifications count:', err);
      },
    });
  }
  onLogout(): void {
    this.authService.logout();
  }
}
