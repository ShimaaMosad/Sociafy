import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, combineLatest, map, takeUntil } from 'rxjs';
import {
  ActivityFilterType,
  ActivityPostEntry,
  ActivityService,
} from '../../services/activity.service';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent],
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.css'],
})
export class ActivityFeedComponent implements OnInit, OnDestroy {
  private activityService = inject(ActivityService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  isLoading$ = this.activityService.isLoading$;
  filter$ = this.activityService.filter$;
  entries$ = this.activityService.entries$;

  visibleEntries$ = combineLatest([this.entries$, this.filter$]).pipe(
    map(([entries, filter]) => {
      if (filter === 'liked-posts') return entries.filter((e) => e.likedPost);
      if (filter === 'commented-posts') return entries.filter((e) => e.commentedOnPost);
      if (filter === 'liked-comments') return entries.filter((e) => e.likedCommentOnPost);
      return entries;
    }),
  );

  counts$ = this.entries$.pipe(
    map((entries) => ({
      all: entries.length,
      likedPosts: entries.filter((e) => e.likedPost).length,
      commentedPosts: entries.filter((e) => e.commentedOnPost).length,
      likedComments: entries.filter((e) => e.likedCommentOnPost).length,
    })),
  );

  ngOnInit(): void {
    const queryFilter = this.route.snapshot.queryParamMap.get(
      'filter',
    ) as ActivityFilterType | null;
    if (
      queryFilter === 'all' ||
      queryFilter === 'liked-posts' ||
      queryFilter === 'commented-posts' ||
      queryFilter === 'liked-comments'
    ) {
      this.activityService.setFilter(queryFilter);
    }

    this.isLoading$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.detectChanges();
    });

    this.entries$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.detectChanges();
    });

    const hasExistingEntries = this.activityService.currentEntries.length > 0;
    void this.activityService.loadActivity(hasExistingEntries, hasExistingEntries);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(filter: ActivityFilterType): void {
    this.activityService.setFilter(filter);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter },
      queryParamsHandling: 'merge',
    });
  }

  onPostLikeToggled(event: { postId: string; isLiked: boolean; post?: any }): void {
    this.activityService.recordPostLike(event.postId, event.isLiked, event.post || null);
  }

  trackByPostId(_index: number, item: ActivityPostEntry): string {
    return item.postId;
  }
}
