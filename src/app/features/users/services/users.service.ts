import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

import { TogglefollowResponse } from '../models/togglefollow-response.interface';
import { BookmarksResponse } from '../models/bookmarks-response.interface';
import { FollowsuggestionsResponse } from '../models/followsuggestions-response.interface';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/users`;

  private followingIdsSubject = new BehaviorSubject<Set<string>>(new Set<string>());
  readonly followingIds$ = this.followingIdsSubject.asObservable();

  toggleFollow(id: string): Observable<TogglefollowResponse> {
    return this.http.put<TogglefollowResponse>(`${this.apiUrl}/${id}/follow`, {}).pipe(
      tap((res: any) => {
        const nextSet = new Set<string>(this.followingIdsSubject.value);
        const isNowFollowing =
          typeof res?.data?.following === 'boolean' ? res.data.following : !nextSet.has(id);

        if (isNowFollowing) {
          nextSet.add(id);
        } else {
          nextSet.delete(id);
        }

        this.followingIdsSubject.next(nextSet);
      }),
    );
  }

  seedFollowingIds(ids: string[]) {
    const nextSet = new Set<string>(this.followingIdsSubject.value);
    ids.filter(Boolean).forEach((id) => nextSet.add(id));
    this.followingIdsSubject.next(nextSet);
  }

  setUserFollowing(userId: string, following: boolean) {
    if (!userId) return;
    const nextSet = new Set<string>(this.followingIdsSubject.value);
    if (following) {
      nextSet.add(userId);
    } else {
      nextSet.delete(userId);
    }
    this.followingIdsSubject.next(nextSet);
  }

  isFollowing(userId: string): boolean {
    return this.followingIdsSubject.value.has(userId);
  }

  getBookmarks(): Observable<BookmarksResponse> {
    return this.http.get<BookmarksResponse>(`${this.apiUrl}/bookmarks`);
  }

  getFollowSuggestions(limit: number = 10, page?: number): Observable<FollowsuggestionsResponse> {
    const params: Record<string, string> = {
      limit: String(limit),
    };
    if (typeof page === 'number') {
      params['page'] = String(page);
    }

    return this.http.get<FollowsuggestionsResponse>(`${this.apiUrl}/suggestions`, {
      params,
    });
  }
}
