import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AppNotification } from '../../models/notification';
import { StorageService } from './storage';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly key = 'notifications';
  private readonly createdNotificationSubject = new Subject<AppNotification>();

  readonly createdNotification$ = this.createdNotificationSubject.asObservable();

  constructor(private storage: StorageService) {}

  getNotificationsForUser(user: string): AppNotification[] {
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
}
