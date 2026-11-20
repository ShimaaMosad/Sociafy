import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component';
import { PostsService } from '../../services/posts.service';
import { PostItem } from '../../models/posts.interface';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, PostCardComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css',
})
export class ExploreComponent implements OnInit {
  private postsService = inject(PostsService);
  private router = inject(Router);

  posts: PostItem[] = [];
  isLoading = false;
  isFetchingMore = false;
  errorMessage = '';

  currentPage = 1;
  hasMorePosts = true;

  ngOnInit(): void {
    this.loadAllPosts();
  }

  loadAllPosts(isLoadMore: boolean = false): void {
    if (isLoadMore) {
      this.isFetchingMore = true;
    } else {
      this.isLoading = true;
      this.currentPage = 1;
      this.posts = [];
    }
    this.errorMessage = '';
    this.postsService.GetAllPosts(this.currentPage, 10).subscribe({
      next: (response) => {
        const fetchedPosts = response.data?.posts || [];

        if (fetchedPosts.length === 0) {
          this.hasMorePosts = false;
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
        this.errorMessage = error.error?.message || 'Failed to load posts. Please try again.';
        this.isLoading = false;
        this.isFetchingMore = false;
      },
    });
  }

  loadMorePosts(): void {
    if (this.isFetchingMore || !this.hasMorePosts) return;
    this.currentPage++;
    this.loadAllPosts(true);
  }

  removePostFromList(deletedPostId: string) {
    this.posts = this.posts.filter((p) => (p._id || p.id) !== deletedPostId);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
}
