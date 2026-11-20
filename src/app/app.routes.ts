import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  // 1. مسارات الـ Auth (للـ Guests فقط - لو مسجل دخول يحوله guestGuard للـ home)
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        title: 'Sociafy | Login',
        loadComponent: () =>
          import('./features/auth/components/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        title: 'Sociafy | Register',
        loadComponent: () =>
          import('./features/auth/components/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'terms',
        title: 'Sociafy | Terms & Conditions',
        loadComponent: () =>
          import('./features/auth/components/terms-conditions/terms-conditions.component').then(
            (m) => m.TermsConditionsComponent,
          ),
      },
      {
        path: 'privacy',
        title: 'Sociafy | Privacy Policy',
        loadComponent: () =>
          import('./features/auth/components/policy-privacy/policy-privacy.component').then(
            (m) => m.PolicyPrivacyComponent,
          ),
      },
    ],
  },

  // 2. مسارات التطبيق الرئيسية (تحتاج Auth Guard وتعمل داخل MainLayoutComponent)
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },

      // Home Feed
      {
        path: 'home',
        title: 'Sociafy | Home',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },

      // Posts & Feeds
      {
        path: 'create-post',
        title: 'Sociafy | Create Post',
        loadComponent: () =>
          import('./features/posts/components/create-post/create-post.component').then(
            (m) => m.CreatePostComponent,
          ),
      },
      {
        path: 'posts/:id',
        title: 'Sociafy | Post Details',
        loadComponent: () =>
          import('./features/posts/components/post-details/post-details.component').then(
            (m) => m.PostDetailsComponent,
          ),
      },
      {
        path: 'saved',
        title: 'Sociafy | Saved Bookmarks',
        loadComponent: () =>
          import('./features/posts/components/bookmarks/bookmarks.component').then(
            (m) => m.BookmarksComponent,
          ),
      },
      {
        path: 'feedactivity',
        title: 'Sociafy | Feed Activity',
        loadComponent: () =>
          import('./features/posts/components/activity-feed/activity-feed.component').then(
            (m) => m.ActivityFeedComponent,
          ),
      },
      {
        path: 'explore',
        title: 'Sociafy | Explore',
        loadComponent: () =>
          import('./features/posts/components/explore/explore.component').then(
            (m) => m.ExploreComponent,
          ),
      },
      {
        path: 'search',
        title: 'Sociafy | Search',
        loadComponent: () =>
          import('./features/posts/components/search/search.component').then(
            (m) => m.SearchComponent,
          ),
      },

      // User Profiles
      {
        path: 'profile',
        title: 'Sociafy | My Profile',
        loadComponent: () =>
          import('./features/profile/components/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'profile/:id',
        title: 'Sociafy | User Profile',
        loadComponent: () =>
          import('./features/profile/components/user-profile/user-profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },

      // Settings & Account Configuration (يشمل تغيير الباسورد لحساب مسجل دخوله)
      {
        path: 'changePassword',
        title: 'Sociafy | Change Password',
        loadComponent: () =>
          import('./features/auth/components/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
      {
        path: 'settings',
        title: 'Sociafy | Settings',
        loadComponent: () =>
          import('./features/auth/components/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },

      // Suggestions & Friends
      {
        path: 'suggestions',
        title: 'Sociafy | Suggestions',
        loadComponent: () =>
          import('./features/suggestions/suggestions.component').then(
            (m) => m.SuggestionsComponent,
          ),
      },

      // Notifications
      {
        path: 'notifications',
        title: 'Sociafy | Notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
    ],
  },

  // 3. مسار الـ 404 (Wildcard)
  {
    path: '**',
    title: 'Sociafy | Page Not Found',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
