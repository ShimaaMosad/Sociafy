import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PostsService } from './../../services/posts.service';
import { UsersService } from './../../../users/services/users.service';
import { PostCardComponent } from './../../../home/components/post-card/post-card.component';
import { PostItem } from '../../models/posts.interface';

export interface SearchPerson {
  _id: string;
  name: string;
  username?: string;
  photo?: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, PostCardComponent, RouterLink],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements OnInit {
  private postsService = inject(PostsService);
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);

  searchQuery = '';
  activeTab: 'all' | 'people' | 'posts' = 'all';

  allPosts: PostItem[] = [];
  filteredPosts: PostItem[] = [];

  allPeople: SearchPerson[] = [];
  filteredPeople: SearchPerson[] = [];

  private peopleMap = new Map<string, SearchPerson>();

  postsPage = 1;
  postsLimit = 20;
  hasMorePosts = false;
  isLoadingPostsMore = false;

  peoplePage = 1;
  peopleLimit = 20;
  hasMorePeople = false;
  isLoadingPeopleMore = false;

  isLoading = false;

  ngOnInit(): void {
    this.loadInitialData();
  }

  get isLoadingMore(): boolean {
    if (this.activeTab === 'people') return this.isLoadingPeopleMore;
    if (this.activeTab === 'posts') return this.isLoadingPostsMore;
    return this.isLoadingPostsMore || this.isLoadingPeopleMore;
  }

  get canLoadMore(): boolean {
    if (this.activeTab === 'people') return this.hasMorePeople;
    if (this.activeTab === 'posts') return this.hasMorePosts;
    return this.hasMorePosts || this.hasMorePeople;
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.peopleMap.clear();
    this.allPeople = [];
    this.allPosts = [];
    this.postsPage = 1;
    this.peoplePage = 1;

    let completedRequests = 0;
    const finishOne = () => {
      completedRequests++;
      if (completedRequests >= 2) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    };

    this.fetchPeoplePage(1, false, finishOne);
    this.fetchPostsPage(1, false, finishOne);
  }

  private fetchPeoplePage(page: number, append: boolean, onDone?: () => void): void {
    this.isLoadingPeopleMore = append;

    this.usersService.getFollowSuggestions(this.peopleLimit, page).subscribe({
      next: (res: any) => {
        const rawSuggestions =
          res?.data?.suggestions ??
          res?.data?.users ??
          res?.suggestions ??
          res?.users ??
          (Array.isArray(res?.data) ? res.data : []);

        const list = Array.isArray(rawSuggestions) ? rawSuggestions : [];
        const prevSize = this.peopleMap.size;

        for (const item of list) {
          const u = item?.user || item;
          this.addPerson(u);
        }

        const addedNewCount = this.peopleMap.size - prevSize;
        this.allPeople = Array.from(this.peopleMap.values());

        const totalPages = res?.meta?.pagination?.numberOfPages;
        if (typeof totalPages === 'number') {
          this.hasMorePeople = page < totalPages;
        } else {
          this.hasMorePeople = list.length >= this.peopleLimit && addedNewCount > 0;
        }

        this.peoplePage = page;
        this.runFilter();
        this.isLoadingPeopleMore = false;
        this.cdr.detectChanges();
        onDone?.();
      },
      error: (err) => {
        console.error('Error loading people suggestions:', err);
        this.hasMorePeople = false;
        this.isLoadingPeopleMore = false;
        this.cdr.detectChanges();
        onDone?.();
      },
    });
  }

  private fetchPostsPage(page: number, append: boolean, onDone?: () => void): void {
    this.isLoadingPostsMore = append;

    this.postsService.GetAllPosts(page, this.postsLimit).subscribe({
      next: (res: any) => {
        const incoming: PostItem[] = Array.isArray(res?.data?.posts) ? res.data.posts : [];

        if (append) {
          const existingIds = new Set(this.allPosts.map((p: any) => String(p?._id || p?.id || '')));
          for (const post of incoming) {
            const id = String((post as any)?._id || (post as any)?.id || '');
            if (!id || !existingIds.has(id)) {
              this.allPosts.push(post);
            }
          }
        } else {
          this.allPosts = [...incoming];
        }

        for (const post of incoming as any[]) {
          this.addPerson(post?.user);
          this.addPerson(post?.sharedPost?.user);
          this.addPerson(post?.topComment?.commentCreator);
        }

        this.allPeople = Array.from(this.peopleMap.values());

        const pagination = res?.meta?.pagination;
        if (
          typeof pagination?.currentPage === 'number' &&
          typeof pagination?.numberOfPages === 'number'
        ) {
          this.hasMorePosts = pagination.currentPage < pagination.numberOfPages;
        } else {
          this.hasMorePosts = incoming.length >= this.postsLimit;
        }

        this.postsPage = page;
        this.runFilter();
        this.isLoadingPostsMore = false;
        this.cdr.detectChanges();
        onDone?.();
      },
      error: (err) => {
        console.error('Error loading posts:', err);
        this.hasMorePosts = false;
        this.isLoadingPostsMore = false;
        this.cdr.detectChanges();
        onDone?.();
      },
    });
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.canLoadMore) return;

    if (this.activeTab === 'people') {
      if (this.hasMorePeople) {
        this.fetchPeoplePage(this.peoplePage + 1, true);
      }
      return;
    }

    if (this.activeTab === 'posts') {
      if (this.hasMorePosts) {
        this.fetchPostsPage(this.postsPage + 1, true);
      }
      return;
    }

    if (this.hasMorePosts) {
      this.fetchPostsPage(this.postsPage + 1, true);
    }
    if (this.hasMorePeople) {
      this.fetchPeoplePage(this.peoplePage + 1, true);
    }
  }

  private addPerson(rawUser: any): void {
    if (!rawUser || typeof rawUser !== 'object') return;
    const id = rawUser._id || rawUser.id;
    const name = rawUser.name || '';
    const username = rawUser.username || '';

    if (!id && !name && !username) return;
    const key = String(id || `${name}-${username}`).trim();

    if (!this.peopleMap.has(key)) {
      this.peopleMap.set(key, {
        _id: String(id || key),
        name: name || username || 'Unknown User',
        username: username || undefined,
        photo: rawUser.photo || undefined,
      });
    }
  }

  onSearch(): void {
    this.runFilter();
    this.cdr.detectChanges();
  }

  clearQuery(): void {
    this.searchQuery = '';
    this.runFilter();
    this.cdr.detectChanges();
  }

  setTab(tab: 'all' | 'people' | 'posts'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  private runFilter(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    const cleanQ = q.replace(/^@/, '');

    if (!q) {
      this.filteredPeople = [...this.allPeople];
      this.filteredPosts = [...this.allPosts];
      return;
    }

    this.filteredPeople = this.allPeople.filter((person) => {
      const name = (person.name || '').toLowerCase();
      const username = (person.username || '').toLowerCase().replace(/^@/, '');
      return name.includes(cleanQ) || username.includes(cleanQ);
    });

    this.filteredPosts = this.allPosts.filter((post: any) => {
      const body = (post?.body || '').toLowerCase();
      const sharedBody = (post?.sharedPost?.body || '').toLowerCase();
      const authorName = (post?.user?.name || '').toLowerCase();
      const authorUsername = (post?.user?.username || '').toLowerCase();
      const sharedAuthorName = (post?.sharedPost?.user?.name || '').toLowerCase();

      return (
        body.includes(q) ||
        sharedBody.includes(q) ||
        authorName.includes(cleanQ) ||
        authorUsername.includes(cleanQ) ||
        sharedAuthorName.includes(cleanQ)
      );
    });
  }
}
