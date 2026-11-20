import { TokenService } from './../../../core/services/token.service';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Observable, tap } from 'rxjs';

import { SignupRequest } from '../models/signup-request.interface';
import { authResponse } from '../models/auth-response.interface';
import { SigninRequest } from '../models/signin-request.interface';
import { ChangepasswordRequest } from '../models/changepassword-request.interface';
import { ChangepasswordResponse } from '../models/changepassword-response.interface';
import { CurrentUserService } from '../../../core/services/current-user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private currentUserService = inject(CurrentUserService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private apiUrl = `${environment.baseUrl}/users`;

  signUp(signupData: SignupRequest): Observable<authResponse> {
    return this.http.post<authResponse>(`${this.apiUrl}/signup`, signupData);
  }

  signIn(signinData: SigninRequest): Observable<authResponse> {
    return this.http.post<authResponse>(`${this.apiUrl}/signin`, signinData).pipe(
      tap((response) => {
        this.tokenService.saveToken(response.data.token);
        this.currentUserService.setCurrentUser(response.data.user);
      }),
    );
  }

  changePassword(changePasswordData: ChangepasswordRequest): Observable<ChangepasswordResponse> {
    return this.http.patch<ChangepasswordResponse>(
      `${this.apiUrl}/changepassword`,
      changePasswordData,
    );
  }

  logout(): void {
    this.tokenService.removeToken();
    this.currentUserService.clearCurrentUser();

    this.router.navigate(['/login']);
  }
}
