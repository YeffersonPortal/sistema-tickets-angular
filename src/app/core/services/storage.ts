import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getItem<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  getAll<T>(key: string): T[] {
    return this.getItem<T[]>(key) ?? [];
  }

  saveAll<T>(key: string, items: T[]): boolean {
    try {
      this.setItem(key, items);
      return true;
    } catch {
      return false;
    }
  }

  getById<T extends { id: number }>(key: string, id: number): T | null {
    return this.getAll<T>(key).find((item) => item.id === id) ?? null;
  }

  add<T>(key: string, item: T): boolean {
    const items = this.getAll<T>(key);
    items.push(item);
    return this.saveAll(key, items);
  }

  update<T extends { id: number }>(
    key: string,
    id: number,
    updatedItem: Partial<T>,
  ): boolean {
    const items = this.getAll<T>(key);
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      return false;
    }

    items[index] = { ...items[index], ...updatedItem };
    return this.saveAll(key, items);
  }

  delete<T extends { id: number }>(key: string, id: number): boolean {
    const items = this.getAll<T>(key);
    const filteredItems = items.filter((item) => item.id !== id);

    if (items.length === filteredItems.length) {
      return false;
    }

    return this.saveAll(key, filteredItems);
  }

  clear(key: string): boolean {
    try {
      this.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  exists<T extends { id: number }>(key: string, id: number): boolean {
    return this.getById<T>(key, id) !== null;
  }

  count<T>(key: string): number {
    return this.getAll<T>(key).length;
  }
}
