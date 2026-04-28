import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  kind: ToastKind;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 1;

  show(title: string, message: string, kind: ToastKind = 'info'): void {
    const toast = { id: this.nextId++, title, message, kind };
    this.messages.update((messages) => [...messages, toast]);
    setTimeout(() => this.dismiss(toast.id), 4500);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((toast) => toast.id !== id));
  }
}
