import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileService } from '../../services/profile.service';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component';
import { UsersService } from '../../../users/services/users.service';
import { PostItem } from '../../../posts/models/posts.interface';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  userId: string | null = null;
  currentUserId: string | null = null;
  myFollowingIds: Set<string> = new Set<string>();

  userProfile: any = null;
  userPosts: PostItem[] = [];
  followersList: any[] = [];
  followingList: any[] = [];
  followersCount = 0;
  followingCount = 0;

  isOwnProfile = false;
  isFollowing = false;
  isLoading = true;

  // مودال Followers / Following + البحث الفوري
  showFollowModal = false;
  modalTitle = '';
  modalUsersList: any[] = [];
  filteredModalUsers: any[] = [];
  modalSearchQuery = '';
  isLoadingModalUsers = false;

  ngOnInit(): void {
    this.usersService.followingIds$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((followingSet) => {
        this.myFollowingIds = new Set<string>(followingSet);

        if (this.userId && !this.isOwnProfile) {
          this.isFollowing = this.myFollowingIds.has(this.userId);
        }

        if (this.modalUsersList.length > 0) {
          this.modalUsersList = this.modalUsersList.map((u) => ({
            ...u,
            isFollowing: this.myFollowingIds.has(u._id),
          }));
          this.applyModalFilter();
        }

        this.cdr.detectChanges();
      });

    this.loadCurrentUserAndProfile();
  }

  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item._id || item.id || '';
  }

  loadCurrentUserAndProfile() {
    this.isLoading = true;

    this.profileService.getMyProfile().subscribe({
      next: (myRes: any) => {
        const me = myRes?.data?.user || myRes?.user || {};
        this.currentUserId = this.extractId(me);

        const followingArr = Array.isArray(me?.following) ? me.following : [];
        const fetchedIds = followingArr.map((f: any) => this.extractId(f)).filter(Boolean);

        if (fetchedIds.length > 0) {
          this.usersService.seedFollowingIds(fetchedIds);
        }

        this.route.paramMap.subscribe((params) => {
          this.userId = params.get('id');
          if (this.userId) {
            this.isOwnProfile = Boolean(this.currentUserId) && this.userId === this.currentUserId;
            this.fetchUserProfile(this.userId, me);
          } else {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.route.paramMap.subscribe((params) => {
          this.userId = params.get('id');
          if (this.userId) {
            this.fetchUserProfile(this.userId, null);
          } else {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
    });
  }

  fetchUserProfile(id: string, myUserData: any) {
    this.isLoading = true;

    forkJoin({
      postsRes: this.profileService.getUserProfile(id).pipe(
        catchError((err) => {
          console.error('Error fetching user posts:', err);
          return of(null);
        }),
      ),
      detailsRes: this.profileService.getUserDetailsById(id).pipe(
        catchError((err) => {
          console.error('Error fetching user profile details:', err);
          return of(null);
        }),
      ),
    }).subscribe({
      next: ({ postsRes, detailsRes }: any) => {
        const postsData: any = postsRes?.data || {};
        const detailsData: any = detailsRes?.data || {};

        this.userPosts = Array.isArray(postsData?.posts) ? postsData.posts : [];

        const detailsUser: any = detailsData?.user || {};
        const postUser: any =
          this.userPosts.length > 0 && typeof this.userPosts[0].user === 'object'
            ? this.userPosts[0].user
            : {};

        this.userProfile =
          this.isOwnProfile && myUserData
            ? { ...postUser, ...detailsUser, ...myUserData }
            : { ...postUser, ...detailsUser };

        const rawFollowers =
          detailsUser?.followers ?? (this.isOwnProfile ? myUserData?.followers : []) ?? [];

        const rawFollowing =
          detailsUser?.following ?? (this.isOwnProfile ? myUserData?.following : []) ?? [];

        this.followersList = Array.isArray(rawFollowers) ? rawFollowers : [];
        this.followingList = Array.isArray(rawFollowing) ? rawFollowing : [];

        this.followersCount =
          typeof detailsUser?.followersCount === 'number'
            ? detailsUser.followersCount
            : this.followersList.length;

        this.followingCount =
          typeof detailsUser?.followingCount === 'number'
            ? detailsUser.followingCount
            : this.followingList.length;

        if (!this.isOwnProfile) {
          if (typeof detailsData?.isFollowing === 'boolean') {
            this.isFollowing = detailsData.isFollowing;
            this.usersService.setUserFollowing(id, this.isFollowing);
          } else {
            this.isFollowing = this.myFollowingIds.has(id);
          }
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleFollow() {
    if (!this.userId || this.isOwnProfile) return;

    this.usersService.toggleFollow(this.userId).subscribe({
      next: (res: any) => {
        const nextFollowing =
          typeof res?.data?.following === 'boolean' ? res.data.following : !this.isFollowing;

        this.isFollowing = nextFollowing;
        this.usersService.setUserFollowing(this.userId!, nextFollowing);

        if (typeof res?.data?.followersCount === 'number') {
          this.followersCount = res.data.followersCount;
        } else {
          this.followersCount = this.isFollowing
            ? this.followersCount + 1
            : Math.max(0, this.followersCount - 1);
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling follow:', err),
    });
  }

  onModalSearchChange(value: string) {
    this.modalSearchQuery = value;
    this.applyModalFilter();
    this.cdr.detectChanges();
  }

  clearModalSearch() {
    if (!this.modalSearchQuery) return;
    this.modalSearchQuery = '';
    this.applyModalFilter();
    this.cdr.detectChanges();
  }

  applyModalFilter() {
    const q = this.modalSearchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredModalUsers = [...this.modalUsersList];
      return;
    }

    this.filteredModalUsers = this.modalUsersList.filter((u: any) => {
      const name = (u?.name || '').toLowerCase();
      const username = (u?.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }

  openFollowersModal() {
    this.modalTitle = 'Followers';
    this.modalSearchQuery = '';
    this.filteredModalUsers = [];
    this.loadResolvedUsers(this.followersList);
  }

  openFollowingModal() {
    this.modalTitle = 'Following';
    this.modalSearchQuery = '';
    this.filteredModalUsers = [];
    this.loadResolvedUsers(this.followingList);
  }

  private loadResolvedUsers(rawList: any[]) {
    this.showFollowModal = true;
    this.isLoadingModalUsers = false;

    if (!Array.isArray(rawList) || rawList.length === 0) {
      this.modalUsersList = [];
      this.applyModalFilter();
      this.cdr.detectChanges();
      return;
    }

    this.modalUsersList = rawList
      .map((item: any) => {
        const id = this.extractId(item);
        if (!id) return null;

        const isObj = typeof item === 'object' && item !== null;

        return {
          _id: id,
          name: isObj ? item.name || 'User Name' : 'User Name',
          username: isObj ? item.username || '' : '',
          photo: isObj ? item.photo || item.avatar || '' : '',
          isFollowing: this.myFollowingIds.has(id),
        };
      })
      .filter((u) => u !== null);

    this.applyModalFilter();
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showFollowModal = false;
    this.modalUsersList = [];
    this.filteredModalUsers = [];
    this.modalSearchQuery = '';
    this.isLoadingModalUsers = false;
    this.cdr.detectChanges();
  }

  toggleUserFollowInModal(targetUser: any) {
    const targetId = this.extractId(targetUser);
    if (!targetId) return;

    this.usersService.toggleFollow(targetId).subscribe({
      next: (res: any) => {
        const nextFollowing =
          typeof res?.data?.following === 'boolean' ? res.data.following : !targetUser.isFollowing;

        targetUser.isFollowing = nextFollowing;
        this.usersService.setUserFollowing(targetId, nextFollowing);

        if (targetId === this.userId) {
          this.isFollowing = targetUser.isFollowing;
          if (typeof res?.data?.followersCount === 'number') {
            this.followersCount = res.data.followersCount;
          } else {
            this.followersCount = targetUser.isFollowing
              ? this.followersCount + 1
              : Math.max(0, this.followersCount - 1);
          }
        }

        this.applyModalFilter();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling follow in modal:', err),
    });
  }

  removePostFromList(postId: string) {
    this.userPosts = this.userPosts.filter((post) => (post._id || post.id) !== postId);
  }
}
