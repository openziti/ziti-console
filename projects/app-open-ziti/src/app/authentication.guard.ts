import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";

export const authenticationGuard: CanActivateFn = (route, state) => {
  let isAuthorized = false;
  if (!isAuthorized) {
    inject(Router).navigate(['/ziti-login']);
  }

  return isAuthorized;
};
