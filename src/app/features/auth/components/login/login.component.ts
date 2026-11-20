import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { SigninRequest } from '../../models/signin-request.interface';

@Component({
  selector: 'app-login',
  imports: [RouterLink, PasswordInputComponent, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnDestroy {
  private router = inject(Router);
  private formBuilder = inject(FormBuilder).nonNullable;
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  loginSubscription$: Subscription = new Subscription();

  isLoading = false;
  errorMessage = '';

  loginForm = this.formBuilder.group(
    {
      email: ['', [Validators.required, Validators.email]],
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
    },
    {
      updateOn: 'submit',
    },
  );

  onSubmit(): void {
    if (this.isLoading) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const loginData: SigninRequest = this.loginForm.getRawValue();

    this.isLoading = true;
    this.errorMessage = '';

    this.loginSubscription$ = this.authService.signIn(loginData).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.router.navigate(['/home']);
        }
      },

      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription$.unsubscribe();
  }
}
