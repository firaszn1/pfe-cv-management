import { Injectable, signal } from '@angular/core';

type AlertKind = 'info' | 'danger';

export interface AppAlert {
  title: string;
  message: string;
  kind: AlertKind;
  confirmText: string;
  cancelText?: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  readonly current = signal<AppAlert | null>(null);

  confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    kind?: AlertKind;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.current.set({
        title: options.title,
        message: options.message,
        kind: options.kind ?? 'info',
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        resolve
      });
    });
  }

  alert(options: {
    title: string;
    message: string;
    confirmText?: string;
    kind?: AlertKind;
  }): Promise<void> {
    return this.confirm({
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? 'OK',
      kind: options.kind,
      cancelText: undefined
    }).then(() => undefined);
  }

  close(confirmed: boolean): void {
    const alert = this.current();
    if (!alert) {
      return;
    }

    this.current.set(null);
    alert.resolve(confirmed);
  }
}
