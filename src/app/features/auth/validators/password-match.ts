import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatch: ValidatorFn = (control: AbstractControl): null | ValidationErrors => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('rePassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }
  if (password !== confirmPassword) {
    return { mismatch: true };
  }
  return null;
};
