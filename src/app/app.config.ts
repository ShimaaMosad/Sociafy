import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';

import {
  provideRouter,
  withHashLocation,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({
      eventCoalescing: true,
    }),
    provideRouter(
      routes,

      withHashLocation(),

      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),

      withViewTransitions({
        skipInitialTransition: true,
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor]),
    ),
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true,
      newestOnTop: true,
      tapToDismiss: true,
      easeTime: 300,
    }),
  ],
};
