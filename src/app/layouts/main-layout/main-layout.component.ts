import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LeftSidebarComponent } from './components/left-sidebar/left-sidebar.component';
import { RightSidebarComponent } from './components/right-sidebar/right-sidebar.component';
import { MobileNavigationComponent } from './components/mobile-navigation/mobile-navigation.component';
import { TabletNavigationComponent } from './components/tablet-navigation/tablet-navigation.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,

    NavbarComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    MobileNavigationComponent,
    TabletNavigationComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  router = inject(Router);

  get showRightSidebar(): boolean {
    const currentUrl = this.router.url.split('?')[0];
    return ['/home', '/explore'].includes(currentUrl);
  }
}
