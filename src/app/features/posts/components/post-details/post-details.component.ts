import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../../services/posts.service';
import { ActivityService } from '../../services/activity.service';
import { CommentsService } from '../../../comments/services/comments.service';
import { PostCommentsSyncService } from '../../../comments/services/post-comments-sync.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component';
import { PostItem } from '../../models/posts.interface';

@Component({
  selector: 'app-post-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PostCardComponent],
  templateUrl: './post-details.component.html',
  styleUrl: './post-details.component.css',
})
export class PostDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private postsService = inject(PostsService);
  private activityService = inject(ActivityService);
  private commentsService = inject(CommentsService);
  private commentsSync = inject(PostCommentsSyncService);
  private currentUserService = inject(CurrentUserService);
  private cdr = inject(ChangeDetectorRef);

  backUrl = '/home';
  backLabel = 'Back to Feed';

  postId = '';
  post: PostItem | null = null;
  comments: any[] = [];
  repliesMap: Record<string, any[]> = {};
  expandedReplies: Record<string, boolean> = {};
  loadingReplies: Record<string, boolean> = {};
  newCommentText = '';
  newCommentImageFile: File | null = null;
  newCommentImagePreview: string | null = null;
  submittingComment = false;
  openReplyBoxMap: Record<string, boolean> = {};
  replyTextMap: Record<string, string> = {};
  replyImageFileMap: Record<string, File | null> = {};
  replyImagePreviewMap: Record<string, string | null> = {};
  submittingReplyId: string | null = null;
  editingItemId: string | null = null;
  editingParentCommentId: string | null = null;
  editItemText = '';
  editItemImageFile: File | null = null;
  editItemImagePreview: string | null = null;
  savingEditItem = false;

  likedIds = new Set<string>();
  isLoadingPost = false;
  isLoadingComments = false;
  currentUserId = '';
  replyCountsByCommentId = new Map<string, number>();

  ngOnInit(): void {
    this.resolveBackNavigation();
    this.currentUserId = this.getUserId();
    this.likedIds = new Set<string>(this.commentsService.getLikedCommentIds());

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      if (id && id !== this.postId) {
        this.postId = id;
        this.replyCountsByCommentId.clear();
        this.repliesMap = {};
        this.expandedReplies = {};
        this.openReplyBoxMap = {};
        this.cancelEdit();
        this.loadPostDetails();
        this.loadComments();
      }
    });
  }

  private getCandidateReturnUrl(): string {
    const navState = history.state as { returnUrl?: string } | undefined;
    const queryReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return navState?.returnUrl || queryReturnUrl || '';
  }

  private resolveBackNavigation(): void {
    const candidateUrl = this.getCandidateReturnUrl();
    if (candidateUrl.includes('/feed/activity')) {
      this.backUrl = candidateUrl;
      this.backLabel = 'Back to Activity';
    } else {
      this.backUrl = '/home';
      this.backLabel = 'Back to Feed';
    }
  }

  goBack(): void {
    const candidateUrl = this.getCandidateReturnUrl();
    if (candidateUrl.includes('/feed/activity')) {
      void this.router.navigateByUrl(candidateUrl);
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate([this.backUrl]);
    }
  }

  get totalCommentsAndRepliesCount(): number {
    let repliesSum = 0;
    for (const c of this.comments) {
      const cid = this.extractId(c);
      const loadedReplies = this.repliesMap[cid];
      const tracked = this.replyCountsByCommentId.get(cid);
      const serverCount = Number(c?.repliesCount || 0);

      if (Array.isArray(loadedReplies)) {
        repliesSum += Math.max(serverCount, loadedReplies.length);
      } else if (tracked !== undefined) {
        repliesSum += tracked;
      } else {
        repliesSum += serverCount;
      }
    }
    return this.comments.length + repliesSum;
  }

  getCommentRepliesDisplayCount(comment: any): number {
    const cid = this.extractId(comment);
    const loadedLen = this.repliesMap[cid]?.length ?? 0;
    const serverCount = Number(comment?.repliesCount || 0);
    return Math.max(serverCount, loadedLen);
  }

  getLikesDisplayCount(item: any): number {
    if (typeof item?.likesCount === 'number') return item.likesCount;
    return Array.isArray(item?.likes) ? item.likes.length : 0;
  }

  isItemLiked(item: any): boolean {
    const id = this.extractId(item);
    if (!id) return Boolean(item?.isLiked);
    const likesArr = Array.isArray(item?.likes) ? item.likes : [];
    const inLikes = this.currentUserId
      ? likesArr.some((u: any) => this.extractId(u) === this.currentUserId)
      : false;
    return inLikes || this.likedIds.has(id) || Boolean(item?.isLiked);
  }

  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    return String(item?._id || item?.id || '');
  }

  private buildPayload(text?: string, imageFile?: File | null): { content?: string; image?: File } {
    const payload: { content?: string; image?: File } = {};
    const trimmed = (text || '').trim();
    if (trimmed.length > 0) {
      payload.content = trimmed;
    }
    if (imageFile instanceof File) {
      payload.image = imageFile;
    }
    return payload;
  }

  private syncTotals(): void {
    const totalCount = this.totalCommentsAndRepliesCount;
    if (this.post) {
      this.post.commentsCount = totalCount;
    }
    if (this.postId) {
      this.commentsSync.setPostTotalCount(this.postId, totalCount);
    }
  }

  private getUserId(): string {
    const user: any = this.currentUserService.getCurrentUser();
    if (user?._id) return String(user._id);
    if (user?.id) return String(user.id);

    for (const key of ['user', 'currentUser', 'userData', 'profile', 'authUser']) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const p = JSON.parse(raw);
        const id = p?._id || p?.id || p?.user?._id || p?.user?.id || p?.data?._id;
        if (id) return String(id);
      } catch {}
    }
    return '';
  }

  loadPostDetails(): void {
    if (!this.postId) return;
    this.isLoadingPost = true;
    this.cdr.detectChanges();

    this.postsService.GetSinglePost(this.postId).subscribe({
      next: (res: any) => {
        this.post = res?.data?.post || res?.post || res?.data || null;
        this.isLoadingPost = false;
        this.syncTotals();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading post details:', err?.error || err);
        this.isLoadingPost = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadComments(): void {
    if (!this.postId) return;
    this.isLoadingComments = true;
    this.cdr.detectChanges();

    this.commentsService.getPostComments(this.postId, 1, 50).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data?.comments) ? res.data.comments : [];
        this.comments = list.map((c: any) => this.hydrateItemLike(c));
        this.replyCountsByCommentId.clear();

        for (const c of this.comments) {
          const cid = this.extractId(c);
          if (cid) {
            this.replyCountsByCommentId.set(cid, Number(c?.repliesCount || 0));
          }
        }

        this.syncTotals();
        this.isLoadingComments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading comments:', err?.error || err);
        this.isLoadingComments = false;
        this.cdr.detectChanges();
      },
    });
  }

  private hydrateItemLike(item: any): any {
    const id = this.extractId(item);
    const liked = this.isItemLiked(item);
    if (liked && id) {
      this.likedIds.add(id);
      this.commentsService.saveLikedCommentId(id, true, this.currentUserId, this.postId);
    }
    return {
      ...item,
      isLiked: liked,
      likesCount:
        typeof item?.likesCount === 'number'
          ? item.likesCount
          : Array.isArray(item?.likes)
            ? item.likes.length
            : 0,
    };
  }

  onNewCommentImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.newCommentImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.newCommentImagePreview = typeof reader.result === 'string' ? reader.result : null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearNewCommentImage(): void {
    this.newCommentImageFile = null;
    this.newCommentImagePreview = null;
    this.cdr.detectChanges();
  }

  addComment(): void {
    const content = (this.newCommentText || '').trim();
    if ((!content && !this.newCommentImageFile) || !this.postId || this.submittingComment) return;

    this.submittingComment = true;
    this.commentsService
      .createComment(this.postId, this.buildPayload(content, this.newCommentImageFile))
      .subscribe({
        next: () => {
          this.newCommentText = '';
          this.clearNewCommentImage();
          this.submittingComment = false;
          this.activityService.recordCommentCreated(this.postId, this.post);
          this.loadComments();
        },
        error: (err) => {
          console.error('Error adding comment:', err?.error || err);
          this.submittingComment = false;
          this.cdr.detectChanges();
        },
      });
  }

  toggleReplies(comment: any): void {
    const commentId = this.extractId(comment);
    if (!commentId) return;

    const nextState = !this.expandedReplies[commentId];
    this.expandedReplies[commentId] = nextState;

    if (nextState && !this.repliesMap[commentId]) {
      this.fetchReplies(commentId);
    } else {
      this.cdr.detectChanges();
    }
  }

  toggleReplyInput(boxKey: string, parentComment?: any): void {
    if (!boxKey) return;
    this.openReplyBoxMap[boxKey] = !this.openReplyBoxMap[boxKey];
    if (parentComment) {
      const cid = this.extractId(parentComment);
      if (cid) {
        this.expandedReplies[cid] = true;
        if (!this.repliesMap[cid]) {
          this.fetchReplies(cid);
        }
      }
    }
    this.cdr.detectChanges();
  }

  fetchReplies(commentId: string): void {
    if (!this.postId || !commentId) return;
    this.loadingReplies[commentId] = true;
    this.cdr.detectChanges();

    this.commentsService.getCommentsReplies(this.postId, commentId, 1, 50).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data?.replies)
          ? res.data.replies
          : Array.isArray(res?.data?.comments)
            ? res.data.comments
            : [];
        const hydrated = list.map((r: any) => this.hydrateItemLike(r));
        this.repliesMap[commentId] = hydrated;

        const targetComment = this.comments.find((c: any) => this.extractId(c) === commentId);
        const count = Math.max(Number(targetComment?.repliesCount || 0), hydrated.length);
        if (targetComment) {
          targetComment.repliesCount = count;
        }
        this.replyCountsByCommentId.set(commentId, count);
        this.syncTotals();

        this.loadingReplies[commentId] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading replies:', err?.error || err);
        this.loadingReplies[commentId] = false;
        this.cdr.detectChanges();
      },
    });
  }

  onReplyImageSelected(boxKey: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !boxKey) return;

    this.replyImageFileMap[boxKey] = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.replyImagePreviewMap[boxKey] = typeof reader.result === 'string' ? reader.result : null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearReplyImage(boxKey: string): void {
    this.replyImageFileMap[boxKey] = null;
    this.replyImagePreviewMap[boxKey] = null;
    this.cdr.detectChanges();
  }

  addReply(parentComment: any, targetReply?: any): void {
    const commentId = this.extractId(parentComment);
    const boxKey = targetReply ? this.extractId(targetReply) : commentId;
    if (!this.postId || !commentId || !boxKey || this.submittingReplyId) return;

    const rawText = (this.replyTextMap[boxKey] || '').trim();
    const mentionName = targetReply?.commentCreator?.name || targetReply?.user?.name || '';
    const finalContent =
      targetReply && mentionName && rawText && !rawText.startsWith(`@${mentionName}`)
        ? `@${mentionName} ${rawText}`
        : rawText;

    const imageFile = this.replyImageFileMap[boxKey] || null;
    if (!finalContent && !imageFile) return;

    this.submittingReplyId = boxKey;
    this.commentsService
      .createReplay(this.postId, commentId, this.buildPayload(finalContent, imageFile))
      .subscribe({
        next: () => {
          this.replyTextMap[boxKey] = '';
          this.clearReplyImage(boxKey);
          if (targetReply) {
            this.openReplyBoxMap[boxKey] = false;
          }
          this.submittingReplyId = null;
          this.expandedReplies[commentId] = true;
          parentComment.repliesCount = Number(parentComment.repliesCount || 0) + 1;
          this.replyCountsByCommentId.set(commentId, parentComment.repliesCount);
          this.syncTotals();
          this.activityService.recordCommentCreated(this.postId, this.post);
          this.fetchReplies(commentId);
        },
        error: (err) => {
          console.error('Error adding reply:', err?.error || err);
          this.submittingReplyId = null;
          this.cdr.detectChanges();
        },
      });
  }

  startEdit(item: any, parentCommentId: string | null = null): void {
    const id = this.extractId(item);
    if (!id) return;

    this.editingItemId = id;
    this.editingParentCommentId = parentCommentId;
    this.editItemText = item?.content || item?.body || item?.text || '';
    this.editItemImageFile = null;
    this.editItemImagePreview = item?.image || null;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingItemId = null;
    this.editingParentCommentId = null;
    this.editItemText = '';
    this.editItemImageFile = null;
    this.editItemImagePreview = null;
    this.savingEditItem = false;
    this.cdr.detectChanges();
  }

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.editItemImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editItemImagePreview = typeof reader.result === 'string' ? reader.result : null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearEditImage(): void {
    this.editItemImageFile = null;
    this.editItemImagePreview = null;
    this.cdr.detectChanges();
  }

  saveEdit(item: any, parentCommentId: string | null = null): void {
    const id = this.extractId(item);
    const trimmed = (this.editItemText || '').trim();
    if ((!trimmed && !this.editItemImageFile) || !id || !this.postId || this.savingEditItem) return;

    this.savingEditItem = true;
    this.cdr.detectChanges();

    const payload = this.buildPayload(trimmed, this.editItemImageFile);

    const request$ = parentCommentId
      ? this.commentsService.updateReplay(this.postId, id, payload)
      : this.commentsService.updateComment(this.postId, id, payload);

    request$.subscribe({
      next: (res: any) => {
        const updated = res?.data?.reply || res?.data?.comment || res?.comment || res?.data;
        if (updated?.content !== undefined) {
          item.content = updated.content;
        } else if (trimmed) {
          item.content = trimmed;
        }

        if (updated?.image !== undefined) {
          item.image = updated.image;
        } else if (this.editItemImagePreview) {
          item.image = this.editItemImagePreview;
        } else if (!this.editItemImageFile) {
          item.image = undefined;
        }

        this.cancelEdit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating item:', err?.error || err);
        this.savingEditItem = false;
        this.cdr.detectChanges();
      },
    });
  }

  onToggleItemLike(item: any): void {
    const id = this.extractId(item);
    if (!this.postId || !id) return;

    const prevLiked = this.isItemLiked(item);
    const prevCount = this.getLikesDisplayCount(item);

    this.commentsService.toggleCommentLike(this.postId, id).subscribe({
      next: (res: any) => {
        const nextLiked = typeof res?.data?.liked === 'boolean' ? res.data.liked : !prevLiked;
        const nextCount =
          typeof res?.data?.likesCount === 'number'
            ? res.data.likesCount
            : nextLiked
              ? prevCount + 1
              : Math.max(0, prevCount - 1);

        item.isLiked = nextLiked;
        item.likesCount = nextCount;

        if (nextLiked) {
          this.likedIds.add(id);
        } else {
          this.likedIds.delete(id);
        }
        this.commentsService.saveLikedCommentId(id, nextLiked, this.currentUserId, this.postId);
        this.activityService.recordCommentLike(this.postId, id, nextLiked, this.post);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling like:', err?.error || err),
    });
  }

  onDeleteComment(comment: any): void {
    const commentId = this.extractId(comment);
    if (!this.postId || !commentId) return;

    this.commentsService.deleteComment(this.postId, commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter((c: any) => this.extractId(c) !== commentId);
        this.replyCountsByCommentId.delete(commentId);
        delete this.repliesMap[commentId];
        this.syncTotals();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error deleting comment:', err?.error || err),
    });
  }

  onDeleteReply(parentComment: any, reply: any): void {
    const parentId = this.extractId(parentComment);
    const replyId = this.extractId(reply);
    if (!this.postId || !replyId) return;

    this.commentsService.deleteComment(this.postId, replyId).subscribe({
      next: () => {
        if (parentId && Array.isArray(this.repliesMap[parentId])) {
          this.repliesMap[parentId] = this.repliesMap[parentId].filter(
            (r: any) => this.extractId(r) !== replyId,
          );
          const nextCount = Math.max(0, Number(parentComment?.repliesCount || 1) - 1);
          parentComment.repliesCount = nextCount;
          this.replyCountsByCommentId.set(parentId, nextCount);
        }
        this.syncTotals();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error deleting reply:', err?.error || err),
    });
  }

  isMine(item: any): boolean {
    if (!this.currentUserId) return false;
    const creator = item?.commentCreator || item?.user || item?.author || item?.createdBy;
    if (!creator) return false;
    const creatorId =
      typeof creator === 'string' ? creator : String(creator?._id || creator?.id || '');
    return creatorId === this.currentUserId;
  }

  onPostDeleted(): void {
    void this.router.navigate(['/home']);
  }
}
