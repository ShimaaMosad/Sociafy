import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Something went wrong. Please try again.';

      switch (error.status) {
        case 0:
          message = 'Network error. Check your internet connection.';
          break;

        case 400:
          message = 'Bad request.';
          break;

        case 401:
          message = 'Please login to continue.';
          break;

        case 403:
          message = 'You do not have permission.';
          break;

        case 404:
          message = 'Requested resource not found.';
          break;

        case 409:
          message = 'This request conflicts with existing data.';
          break;

        case 422:
          message = 'Please check the submitted data.';
          break;

        case 429:
          message = 'Too many requests. Try again later.';
          break;

        case 500:
          message = 'Internal server error.';
          break;
      }

      toastr.error(message, 'Error');

      return throwError(() => error);
    }),
  );
};
