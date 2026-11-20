import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PostsService } from '../../services/posts.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css',
})
export class CreatePostComponent implements OnInit {
  private fb = inject(FormBuilder);
  private postsService = inject(PostsService);
  private currentUserService = inject(CurrentUserService);
  private router = inject(Router);

  isSubmitting = false;
  selectedFile: File | null = null;
  currentUser: any = null;

  postForm: FormGroup = this.fb.group({
    body: [''],
  });

  ngOnInit(): void {
    this.currentUser = this.currentUserService.getCurrentUser();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  get canSubmit(): boolean {
    const bodyVal = this.postForm.get('body')?.value?.trim();
    return !!bodyVal || !!this.selectedFile;
  }

  onSubmit() {
    if (!this.canSubmit) return;

    this.isSubmitting = true;

    const postData = {
      body: this.postForm.value.body || undefined,
      image: this.selectedFile || undefined,
    };

    this.postsService.CreatePost(postData).subscribe({
      next: () => {
        this.postForm.reset();
        this.selectedFile = null;
        this.isSubmitting = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Error creating post:', err);
        this.isSubmitting = false;
      },
    });
  }
}
