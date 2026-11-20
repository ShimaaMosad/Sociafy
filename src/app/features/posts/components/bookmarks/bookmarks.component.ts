import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../../../home/components/post-card/post-card.component'; // Ø¹Ø¯Ù„ÙŠ Ø§Ù„Ù…Ø³Ø§Ø± Ù„Ù„Ù€ PostCard
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
        this.bookmarks = res.data?.bookmarks || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching bookmarks:', err);
        this.isLoading = false;
      },
    });
  }
  removePostFromList(postId: string) {
    this.bookmarks = this.bookmarks.filter((post) => (post._id || post.id) !== postId);
  }
}
