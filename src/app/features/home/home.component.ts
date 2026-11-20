import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { PostsService } from '../posts/services/posts.service';
import { ActivityService } from '../posts/services/activity.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { PostCardComponent } from './components/post-card/post-card.component';
import { PostItem } from '../posts/models/posts.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PostCardComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private postsService = inject(PostsService);
  private activityService = inject(ActivityService);
  private router = inject(Router);
  private currentUserService = inject(CurrentUserService);

  currentUser: any = null;
  posts: PostItem[] = [];
  isLoading = false;
  isFetchingMore = false;
  errorMessage = '';

  currentPage = 1;
  hasMorePosts = true;

  ngOnInit(): void {
    this.currentUser = this.currentUserService.getCurrentUser();
    this.loadPosts();
  }

  loadPosts(isLoadMore: boolean = false): void {
    if (isLoadMore) {
      this.isFetchingMore = true;
    } else {
      this.isLoading = true;
      this.currentPage = 1;
      this.posts = [];
    }
    this.errorMessage = '';

    this.postsService.GetHomeFeed(this.currentPage, 10).subscribe({
      next: (response) => {
        let fetchedPosts = response.data.posts;

        if (!fetchedPosts || fetchedPosts.length === 0) {
          this.hasMorePosts = false;
          this.isLoading = false;
          this.isFetchingMore = false;
          return;
        }

        if (this.currentUser) {
          const currentUserId = this.currentUser._id;
          if (currentUserId) {
            fetchedPosts = fetchedPosts.filter((post: any) => {
              const postUserId = post.user?._id;
              return postUserId !== currentUserId;
            });
          }
        }

        if (isLoadMore) {
          this.posts = [...this.posts, ...fetchedPosts];
        } else {
          this.posts = fetchedPosts;
        }

        this.isLoading = false;
        this.isFetchingMore = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Something went wrong. Please try again.';
        this.isLoading = false;
        this.isFetchingMore = false;
      },
    });
  }

  loadMorePosts(): void {
    if (this.isFetchingMore || !this.hasMorePosts) return;
    this.currentPage++;
    this.loadPosts(true);
  }

  onPostLikeToggled(event: { postId: string; isLiked: boolean; post?: PostItem }): void {
    this.activityService.recordPostLike(event.postId, event.isLiked, event.post || null);
  }

  removePostFromList(deletedPostId: string) {
    this.posts = this.posts.filter((p) => (p._id || p.id) !== deletedPostId);
  }

  goToCreatePostPage() {
    this.router.navigate(['/create-post']);
  }
}
