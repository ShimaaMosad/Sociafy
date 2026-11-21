import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../features/auth/services/auth.service';

@Component({
  selector: 'app-tablet-navigation',
  imports: [RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './tablet-navigation.component.html',
  styleUrl: './tablet-navigation.component.css',
})
export class TabletNavigationComponent {
  private authService = inject(AuthService);

  onLogout(): void {
    this.authService.logout();
  }
}
