import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();
  const router = inject(Router);
  if (token) {
    return router.createUrlTree(['/home']);
  }
  return true;
};
