import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tablet-navigation',
  imports: [RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './tablet-navigation.component.html',
  styleUrl: './tablet-navigation.component.css',
})
export class TabletNavigationComponent {}
