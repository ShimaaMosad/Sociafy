import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordInputComponent } from '../../../../shared/components/password-input/password-input.component';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { passwordMatch } from '../../validators/password-match';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordInputComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent implements OnDestroy {
  private formBuilder = inject(FormBuilder).nonNullable;
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  changePasswordSub$: Subscription = new Subscription();
  isLoading = false;

  changePasswordForm = this.formBuilder.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: [
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
    },
    {
      updateOn: 'submit',
      validators: [passwordMatch],
    },
  );

  onSubmit(): void {
    if (this.isLoading) return;

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { rePassword, ...formData } = this.changePasswordForm.getRawValue();
    const payload = {
      password: formData.password,
      newPassword: formData.newPassword,
    };

    this.isLoading = true;

    this.changePasswordSub$ = this.authService.changePassword(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.toastr.success('Password changed successfully!', 'Success');
        this.changePasswordForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Failed to change password. Please try again.';
        this.toastr.error(msg, 'Error');
      },
    });
  }

  ngOnDestroy(): void {
    this.changePasswordSub$.unsubscribe();
  }
}
