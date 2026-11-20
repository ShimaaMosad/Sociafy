import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-header.component.html',
  styleUrl: './auth-header.component.css',
})
export class AuthHeaderComponent {
  private router = inject(Router);
  currentRoute = '';

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }

  get isLoginRoute(): boolean {
    return this.currentRoute.includes('/login');
  }

  get isRegisterRoute(): boolean {
    return this.currentRoute.includes('/register');
  }
}
