import { Component, Input, OnInit, inject, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentFormComponent } from '../comment-form/comment-form.component';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { CommentsService } from '../../services/comments.service';
import { ActivityService } from '../../../posts/services/activity.service';
import { CommentItem } from '../../models/comments.interface';
import { PostItem } from '../../../posts/models/posts.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [CommonModule, FormsModule, CommentFormComponent],
  templateUrl: './comment-item.component.html',
  styleUrl: './comment-item.component.css',
})
export class CommentItemComponent implements OnInit {
  private commentsService = inject(CommentsService);
  private currentUserService = inject(CurrentUserService);
  private activityService = inject(ActivityService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  @Input({ required: true }) commentData!: CommentItem;
  @Input({ required: true }) postId!: string;
  @Input() postData: PostItem | null = null;

  commentDeleted = output<string>();
  replyCreated = output<void>();
  replyDeleted = output<void>();
  repliesCountChange = output<{ commentId: string; repliesCount: number }>();

  isLiked = false;
  likesCount = 0;
  replies: (CommentItem & { isLiked?: boolean })[] = [];
  showReplies = false;
  showReplyForm = false;
  repliesLoaded = false;
  currentUser: any = null;
  currentUserId = '';
  isMyComment = false;
  isEditingComment = false;
  editCommentContent = '';
  editCommentImageFile: File | null = null;
  editCommentImagePreview: string | null = null;
  isSavingComment = false;
  editingReplyId: string | null = null;
  editReplyContent = '';
  editReplyImageFile: File | null = null;
  editReplyImagePreview: string | null = null;
  isSavingReply = false;

  ngOnInit(): void {
    this.currentUser = this.resolveCurrentUser();
    this.currentUserId = this.extractId(this.currentUser);
    this.likesCount = this.commentData.likesCount || this.commentData.likes?.length || 0;

    const cid = this.extractId(this.commentData);
    const inLikesArr =
      Array.isArray(this.commentData.likes) && this.currentUserId
        ? this.commentData.likes.some((id: any) => this.extractId(id) === this.currentUserId)
        : false;
    const savedLocally = cid ? this.commentsService.getLikedCommentIds().has(cid) : false;

    this.isLiked = inLikesArr || savedLocally;
    if (this.isLiked && cid) {
      this.commentsService.saveLikedCommentId(cid, true, this.currentUserId, this.postId);
    }

    const creatorId = this.getCreatorId(this.commentData);
    this.isMyComment = Boolean(this.currentUserId && creatorId && this.currentUserId === creatorId);

    const initialReplies = (this.commentData as any)?.replies;
    if (Array.isArray(initialReplies) && initialReplies.length > 0) {
      this.replies = initialReplies.map((r: any) => this.normalizeReply(r));
      this.commentData.repliesCount = Math.max(
        Number(this.commentData.repliesCount || 0),
        this.replies.length,
      );
      this.repliesLoaded = true;
    }

    this.emitRepliesCount();
  }

  private resolveCurrentUser(): any {
    const u: any = this.currentUserService.getCurrentUser();
    if (u?.data?.user) return u.data.user;
    if (u?.user) return u.user;
    if (u && (u._id || u.id)) return u;

    try {
      const keys = ['user', 'currentUser', 'userData', 'profile', 'authUser'];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const found = parsed?.data?.user || parsed?.user || parsed;
        if (found?._id || found?.id) return found;
      }
    } catch {}

    return null;
  }

  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    return String(item?._id || item?.id || item?.userId || '');
  }

  private getCreatorId(item: any): string {
    if (!item || typeof item !== 'object') return '';
    const creator = item?.commentCreator || item?.user || item?.author || item?.createdBy;
    return this.extractId(creator);
  }

  private emitRepliesCount(): void {
    const cid = this.extractId(this.commentData);
    if (cid) {
      this.repliesCountChange.emit({
        commentId: cid,
        repliesCount: this.totalRepliesCount,
      });
    }
  }

  get totalRepliesCount(): number {
    const serverCount = Number(this.commentData?.repliesCount || 0);
    return this.repliesLoaded ? Math.max(serverCount, this.replies.length) : serverCount;
  }

  getReplyLikesCount(reply: any): number {
    if (typeof reply?.likesCount === 'number') return reply.likesCount;
    return Array.isArray(reply?.likes) ? reply.likes.length : 0;
  }

  private normalizeReply(reply: any): CommentItem & { isLiked?: boolean } {
    const likesArr = Array.isArray(reply?.likes) ? reply.likes : [];
    const rid = this.extractId(reply);
    const inLikesArr = this.currentUserId
      ? likesArr.some((id: any) => this.extractId(id) === this.currentUserId)
      : false;
    const savedLocally = rid ? this.commentsService.getLikedCommentIds().has(rid) : false;
    const liked = inLikesArr || savedLocally || Boolean(reply?.isLiked);

    if (liked && rid) {
      this.commentsService.saveLikedCommentId(rid, true, this.currentUserId, this.postId);
    }

    const creator = reply?.commentCreator || reply?.user || reply?.author || {};

    return {
      ...reply,
      _id: rid,
      id: rid,
      commentCreator: {
        ...creator,
        _id: this.extractId(creator),
        name: creator?.name || 'User',
        photo: creator?.photo || '',
      },
      likes: likesArr,
      likesCount: typeof reply?.likesCount === 'number' ? reply.likesCount : likesArr.length,
      isLiked: liked,
    };
  }

  isMyReply(reply: any): boolean {
    const creatorId = this.getCreatorId(reply);
    return Boolean(this.currentUserId && creatorId && this.currentUserId === creatorId);
  }

  toggleLike(): void {
    const commentId = this.extractId(this.commentData);
    if (!commentId) return;

    this.commentsService.toggleCommentLike(this.postId, commentId).subscribe({
      next: (res: any) => {
        const liked = typeof res?.data?.liked === 'boolean' ? res.data.liked : !this.isLiked;
        this.isLiked = liked;
        this.likesCount =
          typeof res?.data?.likesCount === 'number'
            ? res.data.likesCount
            : liked
              ? this.likesCount + 1
              : Math.max(0, this.likesCount - 1);

        const currentLikes = Array.isArray(this.commentData.likes)
          ? [...this.commentData.likes]
          : [];
        if (this.currentUserId) {
          if (liked && !currentLikes.some((id: any) => this.extractId(id) === this.currentUserId)) {
            currentLikes.push(this.currentUserId);
            this.commentData.likes = currentLikes;
          } else if (!liked) {
            this.commentData.likes = currentLikes.filter(
              (id: any) => this.extractId(id) !== this.currentUserId,
            );
          }
        }

        this.commentsService.saveLikedCommentId(commentId, liked, this.currentUserId, this.postId);
        this.activityService.recordCommentLike(this.postId, commentId, liked, this.postData);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling comment like:', err),
    });
  }

  startEditComment(): void {
    this.editCommentContent = this.commentData.content || '';
    this.editCommentImageFile = null;
    this.editCommentImagePreview = this.commentData.image || null;
    this.isEditingComment = true;
    this.cdr.detectChanges();
  }

  cancelEditComment(): void {
    this.isEditingComment = false;
    this.editCommentContent = '';
    this.editCommentImageFile = null;
    this.editCommentImagePreview = null;
    this.cdr.detectChanges();
  }

  onCommentEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.editCommentImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editCommentImagePreview = typeof reader.result === 'string' ? reader.result : null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearCommentEditImage(): void {
    this.editCommentImageFile = null;
    this.editCommentImagePreview = null;
    this.cdr.detectChanges();
  }

  saveEditComment(): void {
    const trimmed = this.editCommentContent.trim();
    const commentId = this.extractId(this.commentData);
    if ((!trimmed && !this.editCommentImageFile) || !commentId || this.isSavingComment) return;

    this.isSavingComment = true;
    this.cdr.detectChanges();

    const payload: { content?: string; image?: File } = { content: trimmed };
    if (this.editCommentImageFile) {
      payload.image = this.editCommentImageFile;
    }

    this.commentsService.updateComment(this.postId, commentId, payload).subscribe({
      next: (res: any) => {
        const updated = res?.data?.comment || res?.comment || res?.data;
        if (updated?.content !== undefined) {
          this.commentData.content = updated.content;
        } else if (trimmed) {
          this.commentData.content = trimmed;
        }

        if (updated?.image !== undefined) {
          this.commentData.image = updated.image;
        } else if (this.editCommentImagePreview) {
          this.commentData.image = this.editCommentImagePreview;
        } else if (!this.editCommentImageFile) {
          this.commentData.image = undefined;
        }

        this.cancelEditComment();
        this.isSavingComment = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating comment:', err);
        this.isSavingComment = false;
        this.cdr.detectChanges();
      },
    });
  }

  startEditReply(reply: any): void {
    this.editingReplyId = this.extractId(reply);
    this.editReplyContent = reply?.content || '';
    this.editReplyImageFile = null;
    this.editReplyImagePreview = reply?.image || null;
    this.cdr.detectChanges();
  }

  cancelEditReply(): void {
    this.editingReplyId = null;
    this.editReplyContent = '';
    this.editReplyImageFile = null;
    this.editReplyImagePreview = null;
    this.cdr.detectChanges();
  }

  onReplyEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.editReplyImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editReplyImagePreview = typeof reader.result === 'string' ? reader.result : null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearReplyEditImage(): void {
    this.editReplyImageFile = null;
    this.editReplyImagePreview = null;
    this.cdr.detectChanges();
  }

  saveEditReply(reply: any): void {
    const trimmed = this.editReplyContent.trim();
    const replyId = this.extractId(reply);
    if ((!trimmed && !this.editReplyImageFile) || !replyId || this.isSavingReply) return;

    this.isSavingReply = true;
    this.cdr.detectChanges();

    const payload: { content?: string; image?: File } = { content: trimmed };
    if (this.editReplyImageFile) {
      payload.image = this.editReplyImageFile;
    }

    this.commentsService.updateReplay(this.postId, replyId, payload).subscribe({
      next: (res: any) => {
        const updated = res?.data?.reply || res?.data?.comment || res?.reply || res?.data;
        if (updated?.content !== undefined) {
          reply.content = updated.content;
        } else if (trimmed) {
          reply.content = trimmed;
        }

        if (updated?.image !== undefined) {
          reply.image = updated.image;
        } else if (this.editReplyImagePreview) {
          reply.image = this.editReplyImagePreview;
        } else if (!this.editReplyImageFile) {
          reply.image = undefined;
        }

        this.cancelEditReply();
        this.isSavingReply = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating reply:', err);
        this.isSavingReply = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleReplies(): void {
    this.showReplies = !this.showReplies;
    const commentId = this.extractId(this.commentData);

    if (this.showReplies && !this.repliesLoaded && commentId) {
      this.commentsService.getCommentsReplies(this.postId, commentId).subscribe({
        next: (res: any) => {
          const fetchedReplies =
            res?.data?.replies ??
            res?.data?.comments ??
            res?.replies ??
            res?.comments ??
            (Array.isArray(res?.data) ? res.data : []);

          const normalized = Array.isArray(fetchedReplies)
            ? fetchedReplies.map((reply: any) => this.normalizeReply(reply))
            : [];

          const existingIds = new Set(this.replies.map((r) => this.extractId(r)).filter(Boolean));

          for (const item of normalized) {
            const id = this.extractId(item);
            if (id && !existingIds.has(id)) {
              existingIds.add(id);
              this.replies.push(item);
            } else if (!id) {
              this.replies.push(item);
            }
          }

          this.repliesLoaded = true;
          this.commentData.repliesCount = Math.max(
            Number(this.commentData.repliesCount || 0),
            this.replies.length,
          );
          this.emitRepliesCount();
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err?.status === 404) {
            this.repliesLoaded = true;
          } else {
            console.error('Error fetching replies:', err);
          }
          this.cdr.detectChanges();
        },
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  onReplyAdded(newReply: CommentItem): void {
    const formattedReply = this.normalizeReply(newReply);

    this.replies.push(formattedReply);
    this.repliesLoaded = true;
    this.showReplyForm = false;
    this.showReplies = true;

    this.commentData.repliesCount = Number(this.commentData.repliesCount || 0) + 1;
    this.emitRepliesCount();
    this.activityService.recordCommentCreated(this.postId, this.postData);

    this.replyCreated.emit();
    this.cdr.detectChanges();
  }

  openReplyTo(_reply: any): void {
    this.showReplyForm = true;
    this.cdr.detectChanges();
  }

  toggleReplyLike(reply: any): void {
    const replyId = this.extractId(reply);
    const currentLiked = Boolean(reply?.isLiked);
    const currentCount = this.getReplyLikesCount(reply);

    if (!replyId) {
      const nextLiked = !currentLiked;
      reply.isLiked = nextLiked;
      reply.likesCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
      this.cdr.detectChanges();
      return;
    }

    this.commentsService.toggleCommentLike(this.postId, replyId).subscribe({
      next: (res: any) => {
        const liked = typeof res?.data?.liked === 'boolean' ? res.data.liked : !currentLiked;
        reply.isLiked = liked;
        reply.likesCount =
          typeof res?.data?.likesCount === 'number'
            ? res.data.likesCount
            : liked
              ? currentCount + 1
              : Math.max(0, currentCount - 1);

        const likesArr = Array.isArray(reply.likes) ? [...reply.likes] : [];
        if (this.currentUserId) {
          if (liked && !likesArr.some((id: any) => this.extractId(id) === this.currentUserId)) {
            likesArr.push(this.currentUserId);
            reply.likes = likesArr;
          } else if (!liked) {
            reply.likes = likesArr.filter((id: any) => this.extractId(id) !== this.currentUserId);
          }
        }

        this.commentsService.saveLikedCommentId(replyId, liked, this.currentUserId, this.postId);
        this.activityService.recordCommentLike(this.postId, replyId, liked, this.postData);
        this.cdr.detectChanges();
      },
      error: () => {
        const nextLiked = !currentLiked;
        reply.isLiked = nextLiked;
        reply.likesCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
        this.commentsService.saveLikedCommentId(
          replyId,
          nextLiked,
          this.currentUserId,
          this.postId,
        );
        this.activityService.recordCommentLike(this.postId, replyId, nextLiked, this.postData);
        this.cdr.detectChanges();
      },
    });
  }

  deleteReply(reply: any): void {
    const replyId = this.extractId(reply);
    if (!replyId) return;

    if (!confirm('Are you sure you want to delete this reply?')) return;

    this.commentsService.deleteComment(this.postId, replyId).subscribe({
      next: () => {
        this.replies = this.replies.filter((r) => this.extractId(r) !== replyId);
        this.commentData.repliesCount = Math.max(0, Number(this.commentData.repliesCount || 1) - 1);
        this.emitRepliesCount();
        this.replyDeleted.emit();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error deleting reply:', err),
    });
  }

  deleteComment(): void {
    const commentId = this.extractId(this.commentData);
    if (!commentId) return;

    if (confirm('Are you sure you want to delete this comment?')) {
      this.commentsService.deleteComment(this.postId, commentId).subscribe({
        next: () => {
          this.commentDeleted.emit(commentId);
        },
        error: (err) => console.error('Error deleting comment:', err),
      });
    }
  }

  getCreator(item: any): any {
    return (
      item?.commentCreator ||
      item?.user ||
      item?.author ||
      item?.createdBy ||
      item?.replyCreator ||
      null
    );
  }

  getCreatorName(item: any): string {
    const creator = this.getCreator(item);
    return creator?.name || creator?.username || 'Unknown User';
  }

  getCreatorPhoto(item: any): string {
    const creator = this.getCreator(item);
    const photo = creator?.photo || creator?.avatar || creator?.profileImage || '';
    return photo && String(photo).trim()
      ? String(photo)
      : '/assets/sociafy-default-profile-avatar.png';
  }

  goToUserProfile(creator: any): void {
    const targetId = String(creator?._id || creator?.id || creator?.userId || '').trim();
    if (!targetId) return;

    const currentUser = this.currentUserService.getCurrentUser();
    const currentId = String((currentUser as any)?._id || (currentUser as any)?.id || '').trim();

    if (currentId && targetId === currentId) {
      this.router.navigate(['/profile']);
      return;
    }

    // عدّلي '/user-profile' لو اسم الـ route عندك في app.routes.ts مختلف مثل '/profile'
    this.router.navigate(['/user-profile', targetId]);
  }
}
