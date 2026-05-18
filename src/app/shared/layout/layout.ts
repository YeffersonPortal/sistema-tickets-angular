import { ChangeDetectorRef, DestroyRef, Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService, UserRole } from '../../core/services/auth';
import { AppNotification } from '../../models/notification';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class LayoutComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private dismissToastTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly navItems = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      roles: ['jefe'] as UserRole[],
    },
    {
      label: 'Tickets',
      route: '/tickets',
      roles: ['jefe', 'tecnico', 'colaborador'] as UserRole[],
    },
    {
      label: 'Monitoreo',
      route: '/monitor',
      roles: ['jefe'] as UserRole[],
    },
  ];

  showNotifications = false;
  toastNotification: AppNotification | null = null;
  currentNotifications: AppNotification[] = [];

  constructor(
    private auth: AuthService,
    private notifications: NotificationService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {
    this.notifications.createdNotification$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        if (notification.user !== this.currentUserName) {
          return;
        }

        this.showToast(notification);
      });
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  get currentUserName(): string {
    return this.auth.getCurrentUser()?.nombre || 'Usuario';
  }

  get currentUserRole(): UserRole | null {
    return this.auth.getCurrentRole();
  }

  get currentUserRoleLabel(): string {
    return this.auth.getRoleLabel(this.currentUserRole);
  }

  get currentUserId(): number | null {
    return this.auth.getCurrentUserId();
  }

  get unreadNotifications(): number {
    return this.currentNotifications.filter((notification) => !notification.read).length;
  }

  canAccess(route: string): boolean {
    return this.auth.canAccessRoute(route);
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.loadNotifications();
  }

  markNotificationsAsRead(): void {
    this.notifications.markAllAsRead(this.currentUserName);
    this.currentNotifications = this.currentNotifications.map((notification) => ({
      ...notification,
      read: true,
    }));
    this.showNotifications = false;
    this.changeDetector.detectChanges();
  }

  dismissToast(): void {
    this.toastNotification = null;

    if (this.dismissToastTimeout) {
      clearTimeout(this.dismissToastTimeout);
      this.dismissToastTimeout = null;
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private showToast(notification: AppNotification): void {
    this.toastNotification = notification;

    if (this.dismissToastTimeout) {
      clearTimeout(this.dismissToastTimeout);
    }

    this.dismissToastTimeout = setTimeout(() => {
      this.toastNotification = null;
      this.dismissToastTimeout = null;
    }, 5000);
  }

  private loadNotifications(): void {
    this.notifications
      .getNotificationsForUser(this.currentUserId, this.currentUserName)
      .subscribe((notifications) => {
        this.currentNotifications = notifications;
        this.changeDetector.detectChanges();
      });
  }
}
