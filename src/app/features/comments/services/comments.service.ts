import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CommentPayload {
  content?: string;
  image?: File;
}

interface LikedCommentRecord {
  itemId: string;
  postId?: string;
  userId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  private http = inject(HttpClient);
  private baseUrl = environment.baseUrl;
  private readonly likedStorageKey = 'sociafy_liked_comments_v1';

  private buildFormData(data: CommentPayload): FormData {
    const formData = new FormData();

    if (data?.content && data.content.trim()) {
      formData.append('content', data.content.trim());
    }

    if (data?.image) {
      formData.append('image', data.image);
    }

    return formData;
  }

  getPostComments(postId: string, page: number = 1, limit: number = 50): Observable<any> {
    return this.http.get(`${this.baseUrl}/posts/${postId}/comments`, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  createComment(postId: string, data: CommentPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/posts/${postId}/comments`, this.buildFormData(data));
  }

  getCommentsReplies(
    postId: string,
    commentId: string,
    page: number = 1,
    limit: number = 50,
  ): Observable<any> {
    return this.http.get(`${this.baseUrl}/posts/${postId}/comments/${commentId}/replies`, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  createReplay(postId: string, commentId: string, data: CommentPayload): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/posts/${postId}/comments/${commentId}/replies`,
      this.buildFormData(data),
    );
  }

  updateComment(postId: string, commentId: string, data: CommentPayload): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/posts/${postId}/comments/${commentId}`,
      this.buildFormData(data),
    );
  }

  updateReplay(postId: string, replyId: string, data: CommentPayload): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/posts/${postId}/comments/${replyId}`,
      this.buildFormData(data),
    );
  }
  toggleCommentLike(postId: string, commentOrReplyId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/posts/${postId}/comments/${commentOrReplyId}/like`, {});
  }

  deleteComment(postId: string, commentOrReplyId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/posts/${postId}/comments/${commentOrReplyId}`);
  }

  private readLikedRecords(): LikedCommentRecord[] {
    try {
      const raw = localStorage.getItem(this.likedStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((entry: any) => {
          if (typeof entry === 'string' || typeof entry === 'number') {
            return { itemId: String(entry) };
          }
          if (entry && typeof entry === 'object' && entry.itemId) {
            return {
              itemId: String(entry.itemId),
              postId: entry.postId ? String(entry.postId) : undefined,
              userId: entry.userId ? String(entry.userId) : undefined,
            };
          }
          return null;
        })
        .filter((x): x is LikedCommentRecord => Boolean(x?.itemId));
    } catch {
      return [];
    }
  }

  getLikedCommentIds(): Set<string> {
    return new Set<string>(this.readLikedRecords().map((r) => r.itemId));
  }

  getLikedCommentPostIds(userId?: string): Set<string> {
    const normalizedUser = userId ? String(userId) : '';
    const postIds = new Set<string>();

    for (const record of this.readLikedRecords()) {
      if (!record.postId) continue;
      if (!normalizedUser || !record.userId || record.userId === normalizedUser) {
        postIds.add(record.postId);
      }
    }

    return postIds;
  }

  saveLikedCommentId(itemId: string, liked: boolean, userId?: string, postId?: string): void {
    if (!itemId) return;
    const idStr = String(itemId);
    const records = this.readLikedRecords().filter((r) => r.itemId !== idStr);

    if (liked) {
      records.push({
        itemId: idStr,
        postId: postId ? String(postId) : undefined,
        userId: userId ? String(userId) : undefined,
      });
    }

    try {
      localStorage.setItem(this.likedStorageKey, JSON.stringify(records));
    } catch {
    }
  }
}
