import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, timeout } from 'rxjs';
import { PostItem } from '../models/posts.interface';

import { PostsService } from './posts.service';
import { CommentsService } from '../../comments/services/comments.service';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { CommentItem } from '../../comments/models/comments.interface';

export type ActivityFilterType = 'all' | 'liked-posts' | 'commented-posts' | 'liked-comments';

export interface ActivityPostEntry {
  post: PostItem;
  postId: string;
  likedPost: boolean;
  commentedOnPost: boolean;
  likedCommentOnPost: boolean;
  likedCommentIds: string[];
  activityDate: number;
}

interface CacheEntry {
  entries: ActivityPostEntry[];
  timestamp: number;
}

const CACHE_TTL_MS = 2 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private postsService = inject(PostsService);
  private commentsService = inject(CommentsService);
  private userService = inject(CurrentUserService);

  private readonly pageLimit = 100;
  private readonly maxPagesToScan = 5;
  private readonly pageConcurrency = 5;
  private readonly commentBatchSize = 12;
  private readonly requestTimeoutMs = 5000;

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private entriesSubject = new BehaviorSubject<ActivityPostEntry[]>([]);
  private filterSubject = new BehaviorSubject<ActivityFilterType>('all');
  private cacheByUser = new Map<string, CacheEntry>();
  private likedCommentIdSet = new Set<string>();
  private likedCommentPostIdSet = new Set<string>();
  private inFlightPromise: Promise<void> | null = null;

  isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  entries$: Observable<ActivityPostEntry[]> = this.entriesSubject.asObservable();
  filter$: Observable<ActivityFilterType> = this.filterSubject.asObservable();

  get currentUserId(): string {
    const user = this.userService.getCurrentUser();
    if (user?._id) return String(user._id);
    if ((user as any)?.id) return String((user as any).id);

    for (const key of ['user', 'currentUser', 'userData', 'profile', 'authUser']) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const foundId =
          parsed?._id ||
          parsed?.id ||
          parsed?.user?._id ||
          parsed?.user?.id ||
          parsed?.data?.user?._id ||
          parsed?.data?._id;
        if (foundId) return String(foundId);
      } catch {
      }
    }
    return '';
  }

  get currentEntries(): ActivityPostEntry[] {
    return this.entriesSubject.value;
  }

  get currentFilter(): ActivityFilterType {
    return this.filterSubject.value;
  }

  setFilter(filter: ActivityFilterType): void {
    this.filterSubject.next(filter);
  }

  private commitEntries(nextEntries: ActivityPostEntry[]): void {
    const cleaned = nextEntries
      .filter((entry) => entry.likedPost || entry.commentedOnPost || entry.likedCommentOnPost)
      .sort((a, b) => b.activityDate - a.activityDate);

    this.entriesSubject.next(cleaned);

    const userId = this.currentUserId;
    if (userId) {
      this.cacheByUser.set(userId, { entries: cleaned, timestamp: Date.now() });
    }
  }

  private upsertLiveEntry(
    postId: string,
    post: PostItem | null,
    updater: (entry: ActivityPostEntry) => ActivityPostEntry,
  ): void {
    if (!postId) return;

    const current = [...this.entriesSubject.value];
    const index = current.findIndex((item) => item.postId === postId);
    const now = Date.now();

    if (index !== -1) {
      const existing = current[index];
      const mergedPost = post ? { ...existing.post, ...post } : existing.post;
      current[index] = updater({
        ...existing,
        post: mergedPost,
        activityDate: now,
      });
    } else if (post) {
      const createdTime = new Date((post as any)?.createdAt || now).getTime();
      const fresh: ActivityPostEntry = {
        post,
        postId,
        likedPost: false,
        commentedOnPost: false,
        likedCommentOnPost: false,
        likedCommentIds: [],
        activityDate: Number.isNaN(createdTime) ? now : Math.max(createdTime, now),
      };
      current.push(updater(fresh));
    }

    this.commitEntries(current);
  }

  /**
   * ÙŠÙ†Ø§Ø¯Ù‰ ÙÙˆØ±Ø§Ù‹ Ø¹Ù†Ø¯ Ø¹Ù…Ù„ Like Ø£Ùˆ Unlike Ø¹Ù„Ù‰ Ø¨ÙˆØ³Øª Ù…Ù† Ø£ÙŠ Ù…ÙƒØ§Ù† (Ù…Ø«Ù„ Home)
   */
  recordPostLike(postId: string, isLiked: boolean, post: PostItem | null = null): void {
    if (!postId) return;
    this.upsertLiveEntry(postId, post, (entry) => ({
      ...entry,
      likedPost: isLiked,
    }));
  }

  /**
   * ÙŠÙ†Ø§Ø¯Ù‰ ÙÙˆØ±Ø§Ù‹ Ø¹Ù†Ø¯ Ø¥Ø¶Ø§ÙØ© ÙƒÙˆÙ…Ù†Øª Ø¬Ø¯ÙŠØ¯ Ø¹Ù„Ù‰ Ø¨ÙˆØ³Øª
   */
  recordCommentCreated(postId: string, post: PostItem | null = null): void {
    if (!postId) return;
    this.upsertLiveEntry(postId, post, (entry) => ({
      ...entry,
      commentedOnPost: true,
    }));
  }

  /**
   * ÙŠÙ†Ø§Ø¯Ù‰ ÙÙˆØ±Ø§Ù‹ Ø¹Ù†Ø¯ Ø¹Ù…Ù„ Like Ø£Ùˆ Unlike Ø¹Ù„Ù‰ ÙƒÙˆÙ…Ù†Øª
   */
  recordCommentLike(
    postId: string,
    commentId: string,
    isLiked: boolean,
    post: PostItem | null = null,
  ): void {
    if (!postId) return;

    const cid = String(commentId || '').trim();
    if (cid) {
      if (isLiked) {
        this.likedCommentIdSet.add(cid);
        this.likedCommentPostIdSet.add(postId);
      } else {
        this.likedCommentIdSet.delete(cid);
      }
    }

    this.upsertLiveEntry(postId, post, (entry) => {
      const nextIds = new Set(entry.likedCommentIds);
      if (cid) {
        if (isLiked) nextIds.add(cid);
        else nextIds.delete(cid);
      }
      const hasAnyLikedComment = nextIds.size > 0 || (isLiked && !cid);
      return {
        ...entry,
        likedCommentIds: Array.from(nextIds),
        likedCommentOnPost: hasAnyLikedComment,
      };
    });
  }

  updatePostLikeState(postId: string, isLiked: boolean, post: PostItem | null = null): void {
    this.recordPostLike(postId, isLiked, post);
  }

  private hydrateLikedCommentStores(): void {
    const commentIds = new Set<string>([
      ...this.commentsService.getLikedCommentIds(),
      ...this.likedCommentIdSet,
    ]);
    const postIds = new Set<string>([...this.likedCommentPostIdSet]);

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);

        if (key.includes('liked_comment_posts') || key.includes('likedCommentPosts')) {
          if (Array.isArray(parsed)) parsed.forEach((v) => v && postIds.add(String(v)));
        } else if (key.includes('liked_comment') || key.includes('likedComment')) {
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === 'string' || typeof item === 'number') {
                commentIds.add(String(item));
              } else if (item && typeof item === 'object') {
                const cid = item.commentId || item._id || item.id;
                const pid = item.postId || item.post;
                if (cid) commentIds.add(String(cid));
                if (pid) postIds.add(String(pid));
              }
            });
          } else if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]) => {
              if (v === true) commentIds.add(String(k));
              else if (Array.isArray(v)) v.forEach((id) => id && commentIds.add(String(id)));
            });
          }
        }
      }
    } catch {
    }

    this.likedCommentIdSet = commentIds;
    this.likedCommentPostIdSet = postIds;
  }

  private extractId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    return String(val?._id || val?.id || val?.userId || '');
  }

  private isUserInList(list: any, userId: string): boolean {
    if (!Array.isArray(list) || !userId) return false;
    return list.some((item) => this.extractId(item) === userId);
  }

  private getCommentAuthorId(item: any): string {
    const creator = item?.commentCreator || item?.user || item?.author || item?.createdBy;
    if (!creator) return '';
    return typeof creator === 'string' ? creator : String(creator._id || creator.id || '');
  }

  private isCommentLikedByUser(item: any, cid: string, userId: string): boolean {
    if (cid && this.likedCommentIdSet.has(cid)) return true;
    if (Array.isArray(item?.likes) && userId) {
      return item.likes.some((u: any) => String(u) === userId);
    }
    return false;
  }

  private addActivity(
    builtEntries: ActivityPostEntry[],
    builtMap: Map<string, ActivityPostEntry>,
    post: PostItem,
    postId: string,
    flags: {
      likedPost?: boolean;
      commentedOnPost?: boolean;
      likedCommentOnPost?: boolean;
      likedCommentId?: string;
    },
  ): void {
    let entry = builtMap.get(postId);
    if (!entry) {
      const createdTime = new Date((post as any)?.createdAt || Date.now()).getTime();
      entry = {
        post,
        postId,
        likedPost: false,
        commentedOnPost: false,
        likedCommentOnPost: false,
        likedCommentIds: [],
        activityDate: Number.isNaN(createdTime) ? Date.now() : createdTime,
      };
      builtMap.set(postId, entry);
      builtEntries.push(entry);
    }

    if (flags.likedPost) entry.likedPost = true;
    if (flags.commentedOnPost) entry.commentedOnPost = true;
    if (flags.likedCommentOnPost) entry.likedCommentOnPost = true;
    if (flags.likedCommentId && !entry.likedCommentIds.includes(flags.likedCommentId)) {
      entry.likedCommentIds.push(flags.likedCommentId);
      this.likedCommentIdSet.add(flags.likedCommentId);
    }
  }

  private safeRequest<T>(obs$: Observable<T>): Promise<T | null> {
    return firstValueFrom(obs$.pipe(timeout(this.requestTimeoutMs))).catch(() => null);
  }

  private async fetchAllPosts(): Promise<any[]> {
    const allPosts: any[] = [];
    const seenIds = new Set<string>();

    const collect = (list: any[]) => {
      for (const p of list) {
        const id = String(p?._id || p?.id || '');
        if (id && seenIds.has(id)) continue;
        if (id) seenIds.add(id);
        allPosts.push(p);
      }
    };

    const firstRes: any = await this.safeRequest(this.postsService.GetAllPosts(1, this.pageLimit));
    if (!firstRes) return allPosts;

    const firstList: any[] = Array.isArray(firstRes?.data?.posts) ? firstRes.data.posts : [];
    collect(firstList);

    const totalPagesFromMeta = firstRes?.meta?.pagination?.numberOfPages;
    const totalPages = Math.min(
      typeof totalPagesFromMeta === 'number' && totalPagesFromMeta > 0
        ? totalPagesFromMeta
        : firstList.length < this.pageLimit
          ? 1
          : this.maxPagesToScan,
      this.maxPagesToScan,
    );

    const remainingPages: number[] = [];
    for (let p = 2; p <= totalPages; p++) remainingPages.push(p);

    for (let i = 0; i < remainingPages.length; i += this.pageConcurrency) {
      const batch = remainingPages.slice(i, i + this.pageConcurrency);
      const responses = await Promise.all(
        batch.map((pageNum) =>
          this.safeRequest(this.postsService.GetAllPosts(pageNum, this.pageLimit)),
        ),
      );
      let emptyBatch = true;
      for (const res of responses as any[]) {
        const list: any[] = Array.isArray(res?.data?.posts) ? res.data.posts : [];
        if (list.length > 0) {
          emptyBatch = false;
          collect(list);
        }
      }
      if (typeof totalPagesFromMeta !== 'number' && emptyBatch) break;
    }

    return allPosts;
  }

  private async inspectPostComments(
    post: any,
    postId: string,
    userId: string,
    builtEntries: ActivityPostEntry[],
    builtMap: Map<string, ActivityPostEntry>,
  ): Promise<void> {
    if (!postId) return;
    const cRes: any = await this.safeRequest(this.commentsService.getPostComments(postId, 1, 50));
    const comments: CommentItem[] = Array.isArray(cRes?.data?.comments) ? cRes.data.comments : [];

    for (const c of comments) {
      const cid = String((c as any)?._id || (c as any)?.id || '').trim();
      if (this.getCommentAuthorId(c) === userId) {
        this.addActivity(builtEntries, builtMap, post as PostItem, postId, {
          commentedOnPost: true,
        });
      }
      if (this.isCommentLikedByUser(c, cid, userId)) {
        this.addActivity(builtEntries, builtMap, post as PostItem, postId, {
          likedCommentOnPost: true,
          likedCommentId: cid || undefined,
        });
      }
    }
  }

  async loadActivity(forceRefresh = false, silent = false): Promise<void> {
    const userId = this.currentUserId;

    if (!forceRefresh && userId) {
      const cached = this.cacheByUser.get(userId);
      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_TTL_MS &&
        this.entriesSubject.value.length > 0
      ) {
        this.entriesSubject.next(cached.entries);
        this.isLoadingSubject.next(false);
        return;
      }
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    if (!silent) {
      this.isLoadingSubject.next(true);
    }
    this.hydrateLikedCommentStores();

    this.inFlightPromise = (async () => {
      const builtEntries: ActivityPostEntry[] = [];
      const builtMap = new Map<string, ActivityPostEntry>();

      try {
        const posts = await this.fetchAllPosts();

        for (const post of posts) {
          const postId = String(post?._id || post?.id || '');
          if (!postId) continue;

          if (this.isUserInList(post?.likes, userId)) {
            this.addActivity(builtEntries, builtMap, post as PostItem, postId, { likedPost: true });
          }
          if (this.likedCommentPostIdSet.has(postId)) {
            this.addActivity(builtEntries, builtMap, post as PostItem, postId, {
              likedCommentOnPost: true,
            });
          }
        }

        const postsToCheck = posts.filter((post) => {
          const postId = String(post?._id || post?.id || '');
          if (!postId) return false;
          if (this.likedCommentPostIdSet.has(postId)) return true;
          const count = post?.commentsCount ?? post?.totalComments;
          return count === undefined || Number(count) > 0;
        });

        for (let i = 0; i < postsToCheck.length; i += this.commentBatchSize) {
          const batch = postsToCheck.slice(i, i + this.commentBatchSize);
          await Promise.all(
            batch.map((post) =>
              this.inspectPostComments(
                post,
                String(post?._id || post?.id || ''),
                userId,
                builtEntries,
                builtMap,
              ),
            ),
          );
        }
        const existingById = new Map(this.entriesSubject.value.map((e) => [e.postId, e]));
        for (const entry of builtEntries) {
          const prev = existingById.get(entry.postId);
          if (prev && prev.activityDate > entry.activityDate) {
            entry.likedPost = prev.likedPost;
            entry.commentedOnPost = prev.commentedOnPost || entry.commentedOnPost;
            entry.likedCommentOnPost = prev.likedCommentOnPost || entry.likedCommentOnPost;
            entry.likedCommentIds = Array.from(
              new Set([...entry.likedCommentIds, ...prev.likedCommentIds]),
            );
            entry.activityDate = prev.activityDate;
          }
        }

        this.commitEntries(builtEntries);
      } catch (err) {
        console.error('Error loading activity:', err);
      } finally {
        this.isLoadingSubject.next(false);
        this.inFlightPromise = null;
      }
    })();

    return this.inFlightPromise;
  }
}
