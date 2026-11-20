import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationsService } from './services/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private notificationsService = inject(NotificationsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  notifications: any[] = [];
  isLoading = true;
  isMarkingAll = false;
  hideReadNotifications = true;

  ngOnInit(): void {
    this.fetchNotifications();
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  get visibleNotifications(): any[] {
    if (!this.hideReadNotifications) {
      return this.notifications;
    }
    return this.notifications.filter((n) => !n.isRead);
  }

  fetchNotifications() {
    this.isLoading = true;
    this.notificationsService.getNotifications(false, 1, 20).subscribe({
      next: (res: any) => {
        const list = res?.data?.notifications || [];
        this.notifications = list.map((n: any) => ({
          ...n,
          isRead: Boolean(n?.isRead),
        }));
        this.notificationsService.setUnreadCount(this.unreadCount);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching notifications:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  markSingleAsRead(notification: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!notification || notification.isRead) return;

    const notifId = notification._id || notification.id;
    notification.isRead = true;
    this.notificationsService.decrementUnreadCount(1);
    this.cdr.detectChanges();

    if (notifId) {
      this.notificationsService.markNotificationsAsRead(notifId).subscribe({
        next: () => {
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error marking notification as read:', err);
        },
      });
    }
  }

  onNotificationClick(notification: any) {
    if (!notification.isRead) {
      this.markSingleAsRead(notification);
    }

    const postId = notification.entityId || notification.entity?._id || notification.postId;
    if (postId) {
      this.router.navigate(['/posts', postId]);
    }
  }

  markAllAsRead() {
    if (this.unreadCount === 0 || this.isMarkingAll) return;

    this.isMarkingAll = true;
    this.notifications.forEach((n) => (n.isRead = true));
    this.notificationsService.clearUnreadCount();
    this.cdr.detectChanges();

    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.isMarkingAll = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error marking all as read:', err);
        this.isMarkingAll = false;
        this.cdr.detectChanges();
      },
    });
  }

  getNotificationIcon(type: string): { icon: string; bgClass: string } {
    switch (type?.toLowerCase()) {
      case 'like':
        return { icon: 'fa-solid fa-heart', bgClass: 'bg-primary text-white' };
      case 'follow':
        return { icon: 'fa-solid fa-user-plus', bgClass: 'bg-accent-green text-white' };
      case 'comment':
        return { icon: 'fa-solid fa-comment', bgClass: 'bg-blue-500 text-white' };
      default:
        return { icon: 'fa-solid fa-bell', bgClass: 'bg-primary text-white' };
    }
  }
}
