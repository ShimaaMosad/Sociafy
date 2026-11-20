import { Component, Input, OnInit, inject, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { PostsService } from '../../../posts/services/posts.service';
import { CommentsService } from '../../../comments/services/comments.service';
import { PostCommentsSyncService } from '../../../comments/services/post-comments-sync.service';
import { ActivityService } from '../../../posts/services/activity.service';
import { PostItem } from '../../../posts/models/posts.interface';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css',
})
export class PostCardComponent implements OnInit {
  @Input({ required: true }) postData!: PostItem;
  @Input() hideComments: boolean = false;
  @Input() hideViewDetails: boolean = false;
  @Input() hideCommentInput = false;
  postDeleted = output<string>();
  likeToggled = output<{ postId: string; isLiked: boolean; post?: PostItem }>();

  private currentUserService = inject(CurrentUserService);
  private postsService = inject(PostsService);
  private commentsService = inject(CommentsService);
  public commentsSync = inject(PostCommentsSyncService);
  private activityService = inject(ActivityService);
  private cdr = inject(ChangeDetectorRef);

  isMyPost = false;
  isMyProfileLink = false;
  isLiked = false;
  isBookmarked = false;
  isEditing = false;
  updatedBody = '';
  isSavingEdit = false;
  showDropdown = false;
  showShareModal = false;
  shareBody = '';
  isSharing = false;

  quickCommentText = '';
  isSubmittingComment = false;

  ngOnInit(): void {
    this.checkIsMyPost();
    this.checkIfLiked();
    this.isBookmarked = (this.postData as any).bookmarked || false;
    this.normalizeInitialCommentsCount();
    this.fetchAccurateCommentsAndRepliesCount();
  }

  private getPostIdentifier(): string {
    return this.postData?._id || this.postData?.id || '';
  }

  private normalizeInitialCommentsCount(): void {
    const postAny = this.postData as any;
    const embeddedComments = Array.isArray(postAny?.comments) ? postAny.comments : [];
    const backendCount = Number(this.postData.commentsCount || 0);

    let initialCount = backendCount;
    if (embeddedComments.length > 0) {
      const repliesSum = embeddedComments.reduce(
        (sum: number, c: any) => sum + Number(c?.repliesCount || 0),
        0,
      );
      initialCount = Math.max(backendCount, embeddedComments.length + repliesSum);
    }

    this.postData.commentsCount = initialCount;
  }

  private fetchAccurateCommentsAndRepliesCount(): void {
    const postId = this.getPostIdentifier();
    if (!postId) return;

    this.commentsService.getPostComments(postId, 1, 50).subscribe({
      next: (res: any) => {
        const commentsList = Array.isArray(res?.data?.comments) ? res.data.comments : [];
        const commentsTotal = commentsList.length;
        const repliesTotal = commentsList.reduce(
          (sum: number, c: any) => sum + Number(c?.repliesCount || 0),
          0,
        );
        const accurateTotal = commentsTotal + repliesTotal;

        this.postData.commentsCount = accurateTotal;
        this.commentsSync.setPostTotalCount(postId, accurateTotal);
        this.cdr.detectChanges();
      },
      error: () => {
      },
    });
  }

  getTotalCommentsCount(): number {
    const postId = this.getPostIdentifier();
    const fallback = Number(this.postData?.commentsCount || 0);
    return this.commentsSync.getSnapshotCount(postId, fallback);
  }

  checkIsMyPost() {
    const currentUser = this.currentUserService.getCurrentUser();
    const postUserId = this.postData.user?._id;
    const currentUserId = currentUser?._id;

    if (currentUserId && postUserId) {
      this.isMyPost = currentUserId === postUserId;
    }
  }

  checkIfLiked() {
    const currentUser = this.currentUserService.getCurrentUser();
    const currentUserId = currentUser?._id;
    if (currentUserId && Array.isArray(this.postData.likes)) {
      this.isLiked = this.postData.likes.some(
        (like: any) => (typeof like === 'string' ? like : like._id) === currentUserId,
      );
    }
  }

  startEditing() {
    this.isEditing = true;
    this.updatedBody = this.postData.body || '';
  }

  saveUpdatedPost() {
    if (!this.updatedBody.trim()) return;

    const postId = this.getPostIdentifier();
    this.isSavingEdit = true;

    this.postsService.UpdatePost(postId, { body: this.updatedBody }).subscribe({
      next: (res: any) => {
        this.postData.body = res.data?.post?.body || this.updatedBody;
        this.isEditing = false;
        this.isSavingEdit = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating post:', err);
        this.isSavingEdit = false;
        this.cdr.detectChanges();
      },
    });
  }

  onToggleLike() {
    const postId = this.getPostIdentifier();
    if (!postId) return;

    this.postsService.TogglePostLike(postId).subscribe({
      next: (res: any) => {
        this.isLiked = !this.isLiked;
        this.postData.likesCount =
          res.data?.likesCount ??
          (this.isLiked
            ? (this.postData.likesCount || 0) + 1
            : Math.max(0, (this.postData.likesCount || 1) - 1));
        this.activityService.recordPostLike(postId, this.isLiked, this.postData);

        this.likeToggled.emit({
          postId,
          isLiked: this.isLiked,
          post: this.postData,
        });
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling like:', err),
    });
  }

  onToggleBookmark() {
    const postId = this.getPostIdentifier();
    this.postsService.TogglePostBookmark(postId).subscribe({
      next: () => {
        this.isBookmarked = !this.isBookmarked;
        (this.postData as any).bookmarked = this.isBookmarked;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling bookmark:', err),
    });
  }

  onDeletePost() {
    const postId = this.getPostIdentifier();
    if (confirm('Are you sure you want to delete this post?')) {
      this.postsService.DeletePost(postId).subscribe({
        next: () => {
          this.postDeleted.emit(postId);
        },
        error: (err) => console.error('Error deleting post:', err),
      });
    }
  }

  submitShare() {
    const postId = this.getPostIdentifier();
    this.isSharing = true;

    const payload = { body: this.shareBody || 'Shared a post' };
    this.postsService.SharePost(payload, postId).subscribe({
      next: () => {
        this.isSharing = false;
        this.showShareModal = false;
        this.shareBody = '';
        this.cdr.detectChanges();
        alert('Post shared successfully!');
      },
      error: (err) => {
        console.error('Error sharing post:', err);
        this.isSharing = false;
        this.cdr.detectChanges();
      },
    });
  }

  submitQuickComment() {
    if (!this.quickCommentText.trim()) return;

    const postId = this.getPostIdentifier();
    if (!postId) return;

    this.isSubmittingComment = true;

    this.commentsService.createComment(postId, { content: this.quickCommentText }).subscribe({
      next: () => {
        this.quickCommentText = '';
        this.isSubmittingComment = false;
        const nextCount = this.getTotalCommentsCount() + 1;
        this.postData.commentsCount = nextCount;
        this.commentsSync.setPostTotalCount(postId, nextCount);
        this.activityService.recordCommentCreated(postId, this.postData);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating comment:', err);
        this.isSubmittingComment = false;
        this.cdr.detectChanges();
      },
    });
  }
}
