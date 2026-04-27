import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data?.['roles'] as UserRole[] | undefined) ?? [];
  const currentRole = auth.getCurrentRole();

  if (!currentRole || allowedRoles.length === 0 || allowedRoles.includes(currentRole)) {
    return true;
  }

  return router.createUrlTree([auth.getDefaultRouteForCurrentUser()]);
};
