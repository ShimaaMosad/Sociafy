import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { passwordMatch } from '../../validators/password-match';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SignupRequest } from '../../models/signup-request.interface';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordInputComponent, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnDestroy {
  private router = inject(Router);
  private formBuilder = inject(FormBuilder).nonNullable;
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  registerSubscription$: Subscription = new Subscription();

  isLoading = false;
  errorMessage = '';
  isSubmitted = false;
  registerForm = this.formBuilder.group(
    {
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s]+$/),
        ],
      ],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          ),
        ],
      ],
      rePassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    },
    {
      updateOn: 'submit',
      validators: [passwordMatch],
    },
  );

  onSubmit(): void {
    if (this.isLoading) return;
    this.isSubmitted = true;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { terms, ...registerData } = this.registerForm.getRawValue();
    const payload: SignupRequest = registerData;

    this.isLoading = true;
    this.errorMessage = '';

    this.registerSubscription$ = this.authService.signUp(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.router.navigate(['/login']);
        }
      },

      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  ngOnDestroy(): void {
    this.registerSubscription$.unsubscribe();
  }
}
