import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsersService } from '../../../../features/users/services/users.service';
import {
  FollowsuggestionsResponse,
  Suggestion,
} from '../../../../features/users/models/followsuggestions-response.interface';

export interface SuggestionWithState extends Suggestion {
  isFollowing?: boolean;
}

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './right-sidebar.component.html',
  styleUrl: './right-sidebar.component.css',
})
export class RightSidebarComponent implements OnInit {
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  suggestions: SuggestionWithState[] = [];
  isLoading = true;

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

    this.fetchSidebarSuggestions();
  }

  getUserId(user: SuggestionWithState): string {
    return user?._id || (user as any)?.id || '';
  }

  fetchSidebarSuggestions() {
    this.isLoading = true;
    this.usersService.getFollowSuggestions(3).subscribe({
      next: (res: FollowsuggestionsResponse) => {
        const rawSuggestions = res.data?.suggestions || [];
        const seededIds: string[] = [];

        this.suggestions = rawSuggestions.map((user: any) => {
          const id = this.getUserId(user);
          const following =
            typeof user?.isFollowing === 'boolean'
              ? user.isFollowing
              : this.usersService.isFollowing(id);

          if (id && user?.isFollowing === true) {
            seededIds.push(id);
          }

          return {
            ...user,
            isFollowing: following,
          };
        });

        if (seededIds.length > 0) {
          this.usersService.seedFollowingIds(seededIds);
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching sidebar suggestions:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onToggleFollow(user: SuggestionWithState, event?: Event) {
    event?.stopPropagation();
    const userId = this.getUserId(user);
    if (!userId) return;

    this.usersService.toggleFollow(userId).subscribe({
      next: (res) => {
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
