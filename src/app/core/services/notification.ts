import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, Subject } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { ApiResponse } from '../api/api-response';
import { AppNotification } from '../../models/notification';
import { StorageService } from './storage';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly key = 'notifications';
  private readonly createdNotificationSubject = new Subject<AppNotification>();

  readonly createdNotification$ = this.createdNotificationSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService,
  ) {}

  getNotificationsForUser(userId: number | null, userName = ''): Observable<AppNotification[]> {
    if (!userId) {
      return of(this.getLocalNotificationsForUser(userName));
    }

    const params = new HttpParams().set('usuarioId', String(userId));

    return this.http
      .get<ApiResponse<AppNotification[]>>(`${API_BASE_URL}/notificaciones`, { params })
      .pipe(
        map((response) =>
          (response.data ?? []).map((notification) => ({
            ...notification,
            createdAt: this.formatDate(notification.createdAt),
            read: Boolean(notification.read),
          })),
        ),
      );
  }

  getLocalNotificationsForUser(user: string): AppNotification[] {
    return this.storage
      .getAll<AppNotification>(this.key)
      .filter((notification) => notification.user === user)
      .sort((left, right) => right.id - left.id);
  }

  createNotification(user: string, title: string, message: string): void {
    const notifications = this.storage.getAll<AppNotification>(this.key);
    const notification: AppNotification = {
      id: Date.now(),
      user,
      title,
      message,
      createdAt: new Date().toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      read: false,
    };

    notifications.push(notification);
    this.storage.saveAll(this.key, notifications);
    this.createdNotificationSubject.next(notification);
  }

  markAllAsRead(user: string): void {
    const notifications = this.storage.getAll<AppNotification>(this.key);
    const updated = notifications.map((notification) =>
      notification.user === user ? { ...notification, read: true } : notification,
    );
    this.storage.saveAll(this.key, updated);
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
