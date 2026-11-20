import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-mobile-navigation',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-navigation.component.html',
  styleUrl: './mobile-navigation.component.css',
})
export class MobileNavigationComponent {}
