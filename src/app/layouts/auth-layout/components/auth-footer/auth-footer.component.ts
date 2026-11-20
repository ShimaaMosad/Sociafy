import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-footer.component.html',
  styleUrl: './auth-footer.component.css',
})
export class AuthFooterComponent {
  isDropdownOpen = false;
  currentLanguage = 'English';

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectLanguage(lang: string) {
    this.currentLanguage = lang;
    this.isDropdownOpen = false;

    console.log('Language changed to:', lang);
  }

  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
  }
}
