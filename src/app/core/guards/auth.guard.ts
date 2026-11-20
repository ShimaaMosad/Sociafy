import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();
  const router = inject(Router);
  if (token) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
