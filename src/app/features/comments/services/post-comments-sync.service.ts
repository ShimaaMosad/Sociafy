import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PostCommentsSyncService {
  private countsMap$ = new BehaviorSubject<Record<string, number>>({});

  setPostTotalCount(postId: string, totalCount: number): void {
    if (!postId) return;
    const current = this.countsMap$.value;
    this.countsMap$.next({
      ...current,
      [postId]: Math.max(0, Number(totalCount) || 0),
    });
  }

  adjustPostCount(postId: string, delta: number, fallbackCurrent = 0): void {
    if (!postId) return;
    const current = this.countsMap$.value;
    const base = current[postId] !== undefined ? current[postId] : fallbackCurrent;
    this.countsMap$.next({
      ...current,
      [postId]: Math.max(0, base + delta),
    });
  }

  getPostCount$(postId: string, fallback: number): Observable<number> {
    return this.countsMap$.pipe(
      map((mapObj) => (postId && mapObj[postId] !== undefined ? mapObj[postId] : fallback)),
    );
  }

  getSnapshotCount(postId: string, fallback: number): number {
    const mapObj = this.countsMap$.value;
    return postId && mapObj[postId] !== undefined ? mapObj[postId] : fallback;
  }
}
