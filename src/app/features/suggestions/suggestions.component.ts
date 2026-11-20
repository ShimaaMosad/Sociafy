import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsersService } from '../users/services/users.service';

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './suggestions.component.html',
  styleUrl: './suggestions.component.css',
})
export class SuggestionsComponent implements OnInit {
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  readonly pageSize = 10;

  suggestions: any[] = [];
  currentPage = 1;
  isLoading = true;
  isLoadingMore = false;
  hasMore = true;

  ngOnInit(): void {
    this.usersService.followingIds$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((followingSet) => {
        this.suggestions = this.suggestions.map((user) => {
          const id = this.getUserId(user);
          return {
            ...user,
            isFollowing: id ? followingSet.has(id) : Boolean(user.isFollowing),
          };
        });
        this.cdr.detectChanges();
      });

    this.fetchSuggestions(1, false);
  }

  getUserId(user: any): string {
    return user?._id || user?.id || '';
  }

  fetchSuggestions(page: number, isLoadMore: boolean) {
    if (isLoadMore) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }
    this.cdr.detectChanges();

    this.usersService.getFollowSuggestions(this.pageSize, page).subscribe({
      next: (res: any) => {
        const rawSuggestions: any[] = res?.data?.suggestions || [];
        const merged = isLoadMore ? [...this.suggestions] : [];
        const existingIds = new Set(merged.map((u) => this.getUserId(u)).filter(Boolean));
        const seededIds: string[] = [];
        let addedCount = 0;

        for (const user of rawSuggestions) {
          const id = this.getUserId(user);
          if (!id || existingIds.has(id)) continue;

          existingIds.add(id);
          addedCount++;

          const following =
            typeof user?.isFollowing === 'boolean'
              ? user.isFollowing
              : this.usersService.isFollowing(id);

          if (user?.isFollowing === true) {
            seededIds.push(id);
          }

          merged.push({
            ...user,
            isFollowing: following,
          });
        }

        if (seededIds.length > 0) {
          this.usersService.seedFollowingIds(seededIds);
        }

        this.suggestions = merged;
        this.currentPage = page;
        if (rawSuggestions.length === 0 || (isLoadMore && addedCount === 0)) {
          this.hasMore = false;
        } else {
          this.hasMore = true;
        }

        this.isLoading = false;
        this.isLoadingMore = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching suggestions:', err);
        this.isLoading = false;
        this.isLoadingMore = false;
        this.cdr.detectChanges();
      },
    });
  }

  onLoadMore() {
    if (this.isLoadingMore || !this.hasMore) {
      return;
    }

    this.fetchSuggestions(this.currentPage + 1, true);
  }

  onToggleFollow(user: any, event?: Event) {
    event?.stopPropagation();
    const userId = this.getUserId(user);
    if (!userId) return;

    this.usersService.toggleFollow(userId).subscribe({
      next: (res: any) => {
        user.isFollowing =
          typeof res?.data?.following === 'boolean' ? res.data.following : !user.isFollowing;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error toggling follow:', err);
      },
    });
  }
}
