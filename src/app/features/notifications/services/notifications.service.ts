import { GetnotificationsResponse } from './../models/getnotifications-response.interface';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { UnreadcountResponse } from '../models/unreadcount-response.interface';
import { MarknotificationResponse } from '../models/marknotification-response.interface';
import { MarkallreadResponse } from '../models/markallread-response.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/notifications`;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  get unreadCountSnapshot(): number {
    return this.unreadCountSubject.value;
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(Math.max(0, Number(count) || 0));
  }

  decrementUnreadCount(by: number = 1): void {
    this.setUnreadCount(this.unreadCountSnapshot - by);
  }

  clearUnreadCount(): void {
    this.setUnreadCount(0);
  }

  getNotifications(
    unread: boolean = false,
    page: number = 1,
    limit: number = 10,
  ): Observable<GetnotificationsResponse> {
    const params = { unread, page, limit };

    return this.http.get<GetnotificationsResponse>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<UnreadcountResponse> {
    return this.http.get<UnreadcountResponse>(`${this.apiUrl}/unread-count`).pipe(
      tap((res: any) => {
        if (typeof res?.data?.unreadCount === 'number') {
          this.setUnreadCount(res.data.unreadCount);
        }
      }),
    );
  }

  markNotificationsAsRead(id: string): Observable<MarknotificationResponse> {
    return this.http.patch<MarknotificationResponse>(`${this.apiUrl}/${id}/read`, null).pipe(
      tap((res: any) => {
        if (typeof res?.data?.unreadCount === 'number') {
          this.setUnreadCount(res.data.unreadCount);
        }
      }),
    );
  }

  markAllAsRead(): Observable<MarkallreadResponse> {
    return this.http.patch<MarkallreadResponse>(`${this.apiUrl}/read-all`, null).pipe(
      tap(() => {
        this.clearUnreadCount();
      }),
    );
  }
}
