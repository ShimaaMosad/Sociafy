import { Injectable } from '@angular/core';
import { User } from '../../features/auth/models/auth-response.interface';

@Injectable({
  providedIn: 'root',
})
export class CurrentUserService {
  private readonly USER_KEY = 'currentUser';
  currentUser: User | null = null;

  setCurrentUser(user: User): void {
    this.currentUser = user;
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {
    }
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;

    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (raw) {
        this.currentUser = JSON.parse(raw);
        return this.currentUser;
      }
    } catch {
    }

    return null;
  }

  clearCurrentUser(): void {
    this.currentUser = null;
    try {
      localStorage.removeItem(this.USER_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    } catch {
    }
  }
}
