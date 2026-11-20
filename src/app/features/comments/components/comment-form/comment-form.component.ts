import { Component, Input, inject, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentsService } from '../../services/comments.service';
import { ActivityService } from '../../../posts/services/activity.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { PostItem } from '../../../posts/models/posts.interface';

@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-form.component.html',
  styleUrl: './comment-form.component.css',
})
export class CommentFormComponent {
  private commentsService = inject(CommentsService);
  private activityService = inject(ActivityService);
  private currentUserService = inject(CurrentUserService);
  private cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) postId!: string;
  @Input() parentCommentId?: string;
  @Input() isReply: boolean = false;
  @Input() postData: PostItem | null = null;

  commentCreated = output<any>();

  content: string = '';
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  isSubmitting: boolean = false;

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.selectedImage = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = typeof reader.result === 'string' ? reader.result : null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
    this.cdr.detectChanges();
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
    } catch {
      // ignore parse errors
    }

    return {};
  }

  submitComment(): void {
    const trimmed = this.content.trim();
    if ((!trimmed && !this.selectedImage) || this.isSubmitting) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const payload: { content?: string; image?: File } = { content: trimmed };
    if (this.selectedImage) {
      payload.image = this.selectedImage;
    }

    const currentUser = this.resolveCurrentUser();
    const creatorObj = {
      _id: currentUser?._id || currentUser?.id || '',
      id: currentUser?._id || currentUser?.id || '',
      name: currentUser?.name || 'User',
      username: currentUser?.username || '',
      photo: currentUser?.photo || '',
    };

    if (this.isReply && this.parentCommentId) {
      this.commentsService.createReplay(this.postId, this.parentCommentId, payload).subscribe({
        next: (res: any) => {
          const rawReply = res?.data?.reply || res?.data?.comment || res?.reply || res?.data || {};
          const normalizedReply = {
            ...rawReply,
            _id: rawReply?._id || rawReply?.id || '',
            id: rawReply?._id || rawReply?.id || '',
            content: rawReply?.content ?? trimmed,
            image: rawReply?.image || this.imagePreview || undefined,
            likes: Array.isArray(rawReply?.likes) ? rawReply.likes : [],
            likesCount: typeof rawReply?.likesCount === 'number' ? rawReply.likesCount : 0,
            createdAt: rawReply?.createdAt || new Date().toISOString(),
            commentCreator: rawReply?.commentCreator || creatorObj,
          };

          this.content = '';
          this.clearImage();
          this.isSubmitting = false;
          this.activityService.recordCommentCreated(this.postId, this.postData);
          this.commentCreated.emit(normalizedReply);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error creating reply:', err);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.commentsService.createComment(this.postId, payload).subscribe({
        next: (res: any) => {
          const rawComment = res?.data?.comment || res?.comment || res?.data || {};
          const normalizedComment = {
            ...rawComment,
            _id: rawComment?._id || rawComment?.id || '',
            id: rawComment?._id || rawComment?.id || '',
            content: rawComment?.content ?? trimmed,
            image: rawComment?.image || this.imagePreview || undefined,
            likes: Array.isArray(rawComment?.likes) ? rawComment.likes : [],
            likesCount: typeof rawComment?.likesCount === 'number' ? rawComment.likesCount : 0,
            repliesCount:
              typeof rawComment?.repliesCount === 'number' ? rawComment.repliesCount : 0,
            createdAt: rawComment?.createdAt || new Date().toISOString(),
            commentCreator: rawComment?.commentCreator || creatorObj,
          };

          this.content = '';
          this.clearImage();
          this.isSubmitting = false;
          this.activityService.recordCommentCreated(this.postId, this.postData);
          this.commentCreated.emit(normalizedComment);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error creating comment:', err);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
    }
  }
}
