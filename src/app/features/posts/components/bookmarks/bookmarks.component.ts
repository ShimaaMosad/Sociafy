import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component'; // عدلي المسار للـ PostCard
import { UsersService } from '../../../users/services/users.service';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, PostCardComponent],
  templateUrl: './bookmarks.component.html',
  styleUrl: './bookmarks.component.css',
})
export class BookmarksComponent implements OnInit {
  private usersService = inject(UsersService);

  bookmarks: any[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.fetchBookmarks();
  }

  fetchBookmarks() {
    this.isLoading = true;
    this.usersService.getBookmarks().subscribe({
      next: (res: any) => {
        // مطابقة لـ BookmarksResponse حيث الداتا موجودة في data.bookmarks
        this.bookmarks = res.data?.bookmarks || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching bookmarks:', err);
        this.isLoading = false;
      },
    });
  }

  // دالة لحذف البوست من اللستة محلياً لو تم إلغاء حفطه أو حذفه
  removePostFromList(postId: string) {
    this.bookmarks = this.bookmarks.filter((post) => (post._id || post.id) !== postId);
  }
}
