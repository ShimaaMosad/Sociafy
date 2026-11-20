import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileService } from '../../services/profile.service';
import { PostsService } from '../../../posts/services/posts.service';
import { UsersService } from '../../../users/services/users.service';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component';
import { PostItem } from '../../../posts/models/posts.interface';
import { UploadphotoRequest } from '../../models/uploadphoto-request.interface';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private postsService = inject(PostsService);
  private usersService = inject(UsersService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  userProfile: any = null;
  userPosts: PostItem[] = [];
  postsCount = 0;
  isLoading = true;

  private sharedFollowingIds: Set<string> = new Set<string>();
  showPhotoModal = false;
  isUploadingPhoto = false;
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
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
        this.sharedFollowingIds = new Set<string>(followingSet);

        if (this.userProfile) {
          this.userProfile.following = Array.from(this.sharedFollowingIds);
          if (typeof this.userProfile.followingCount !== 'number') {
            this.userProfile.followingCount = this.sharedFollowingIds.size;
          }
        }

        if (this.modalUsersList.length > 0) {
          if (this.modalTitle === 'Following') {
            this.modalUsersList = this.modalUsersList.filter((u) =>
              this.sharedFollowingIds.has(this.extractId(u)),
            );
          } else {
            this.modalUsersList = this.modalUsersList.map((u) => ({
              ...u,
              isFollowing: this.sharedFollowingIds.has(this.extractId(u)),
            }));
          }
          this.applyModalFilter();
        }

        this.cdr.detectChanges();
      });

    this.fetchMyProfile();
  }

  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item._id || item.id || '';
  }

  fetchMyProfile() {
    this.isLoading = true;
    this.profileService.getMyProfile().subscribe({
      next: (res: any) => {
        this.userProfile = res?.data?.user || res?.user || {};

        const followingIds = (
          Array.isArray(this.userProfile?.following) ? this.userProfile.following : []
        )
          .map((f: any) => this.extractId(f))
          .filter(Boolean);

        if (followingIds.length > 0) {
          this.usersService.seedFollowingIds(followingIds);
        }

        this.userProfile.following = Array.from(this.sharedFollowingIds);

        const userId = this.extractId(this.userProfile);

        if (userId) {
          this.fetchUserPosts(userId);
        } else {
          this.postsCount = 0;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching my profile:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  fetchUserPosts(userId: string) {
    this.profileService.getUserProfile(userId).subscribe({
      next: (res: any) => {
        const rawPosts =
          res?.data?.posts ?? res?.posts ?? (Array.isArray(res?.data) ? res.data : []);

        const list: PostItem[] = Array.isArray(rawPosts) ? rawPosts : [];

        const backendTotal =
          res?.data?.pagination?.total ??
          res?.data?.totalPosts ??
          res?.data?.postsCount ??
          res?.totalPosts ??
          res?.postsCount;

        if (list.length > 0) {
          this.userPosts = list;
          this.postsCount =
            typeof backendTotal === 'number' && backendTotal >= list.length
              ? backendTotal
              : list.length;
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }
        this.postsService.GetAllPosts().subscribe({
          next: (allRes: any) => {
            const allPosts: PostItem[] = allRes?.data?.posts || [];
            this.userPosts = allPosts.filter((post: any) => this.extractId(post.user) === userId);
            this.postsCount =
              typeof backendTotal === 'number' ? backendTotal : this.userPosts.length;
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error fetching fallback user posts:', err);
            this.userPosts = [];
            this.postsCount = typeof backendTotal === 'number' ? backendTotal : 0;
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.error('Error fetching user posts:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openEditPhotoModal() {
    this.showPhotoModal = true;
    this.selectedFile = null;
    this.imagePreviewUrl = this.userProfile?.photo || '';
    this.cdr.detectChanges();
  }

  closeEditPhotoModal() {
    this.showPhotoModal = false;
    this.selectedFile = null;
    this.isUploadingPhoto = false;
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto() {
    if (!this.selectedFile) return;

    this.isUploadingPhoto = true;
    const payload: UploadphotoRequest = {
      image: this.selectedFile,
    };

    this.profileService.uploadProfilePhoto(payload).subscribe({
      next: (res: any) => {
        const newPhotoUrl = res?.data?.photo || res?.photo || this.imagePreviewUrl;
        if (this.userProfile && newPhotoUrl) {
          this.userProfile.photo = newPhotoUrl;
        }
        this.isUploadingPhoto = false;
        this.closeEditPhotoModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Detailed Server Error:', err);
        console.error('Error Message from Backend:', err.error);
        this.isUploadingPhoto = false;
        this.cdr.detectChanges();
      },
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
    this.loadUsersDetails(this.userProfile?.followers || [], false);
  }

  openFollowingModal() {
    this.modalTitle = 'Following';
    this.modalSearchQuery = '';
    this.filteredModalUsers = [];
    this.loadUsersDetails(Array.from(this.sharedFollowingIds), true);
  }

  loadUsersDetails(list: any[], defaultFollowingState: boolean) {
    this.showFollowModal = true;
    this.isLoadingModalUsers = true;
    this.modalUsersList = [];
    this.filteredModalUsers = [];
    this.cdr.detectChanges();

    if (!Array.isArray(list) || list.length === 0) {
      this.isLoadingModalUsers = false;
      this.applyModalFilter();
      this.cdr.detectChanges();
      return;
    }

    const requests = list.map((item: any) => {
      const id = this.extractId(item);
      if (!id) return of(null);

      const resolvedFollowing =
        this.modalTitle === 'Following'
          ? true
          : this.sharedFollowingIds.has(id) || defaultFollowingState;

      if (typeof item === 'object' && item !== null && item.name) {
        return of({
          _id: id,
          name: item.name,
          username: item.username || item.email?.split('@')[0] || '',
          photo: item.photo || item.avatar || '',
          isFollowing: resolvedFollowing,
        });
      }

      return this.profileService.getUserDetailsById(id).pipe(
        map((res: any) => {
          const uData = res?.data?.user || res?.data || {};
          return {
            _id: id,
            name: uData.name || 'User Name',
            username: uData.username || uData.email?.split('@')[0] || '',
            photo: uData.photo || uData.avatar || '',
            isFollowing: resolvedFollowing,
          };
        }),
        catchError(() =>
          of({
            _id: id,
            name: 'User',
            username: '',
            photo: '',
            isFollowing: resolvedFollowing,
          }),
        ),
      );
    });

    forkJoin(requests).subscribe({
      next: (users: any[]) => {
        this.modalUsersList = users.filter((u) => u !== null);
        this.applyModalFilter();
        this.isLoadingModalUsers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingModalUsers = false;
        this.applyModalFilter();
        this.cdr.detectChanges();
      },
    });
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

    const actualIndex = this.modalUsersList.findIndex(
      (item: any) => this.extractId(item) === targetId,
    );

    this.usersService.toggleFollow(targetId).subscribe({
      next: (res: any) => {
        const nextFollowing =
          typeof res?.data?.following === 'boolean' ? res.data.following : !targetUser.isFollowing;

        if (this.modalTitle === 'Following' && !nextFollowing) {
          if (actualIndex !== -1) {
            this.modalUsersList.splice(actualIndex, 1);
          }
          if (typeof res?.data?.followingCount === 'number') {
            this.userProfile.followingCount = res.data.followingCount;
          } else {
            this.userProfile.followingCount = this.sharedFollowingIds.size;
          }
        } else {
          targetUser.isFollowing = nextFollowing;
          if (typeof res?.data?.followingCount === 'number') {
            this.userProfile.followingCount = res.data.followingCount;
          } else {
            this.userProfile.followingCount = this.sharedFollowingIds.size;
          }
        }

        this.userProfile.following = Array.from(this.sharedFollowingIds);
        this.applyModalFilter();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling follow:', err),
    });
  }

  removePostFromList(postId: string) {
    this.userPosts = this.userPosts.filter((post) => (post._id || post.id) !== postId);
    this.postsCount = Math.max(0, this.postsCount - 1);
    this.cdr.detectChanges();
  }
}
