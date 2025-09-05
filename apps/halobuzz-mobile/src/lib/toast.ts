import { Alert } from 'react-native';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

class ToastManager {
  private static instance: ToastManager;
  private currentToast: any = null;

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(options: ToastOptions): void {
    const { title, message, type = 'info' } = options;

    // Dismiss current toast if any
    if (this.currentToast) {
      this.currentToast();
    }

    // Create new toast
    const showToast = () => {
      Alert.alert(
        title || this.getTitleForType(type),
        message,
        [
          {
            text: 'OK',
            style: type === 'error' ? 'destructive' : 'default'
          }
        ],
        { cancelable: true }
      );
    };

    this.currentToast = showToast;
    showToast();
  }

  private getTitleForType(type: string): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Info';
    }
  }

  // Convenience methods
  success(message: string, title?: string): void {
    this.show({ message, title, type: 'success' });
  }

  error(message: string, title?: string): void {
    this.show({ message, title, type: 'error' });
  }

  warning(message: string, title?: string): void {
    this.show({ message, title, type: 'warning' });
  }

  info(message: string, title?: string): void {
    this.show({ message, title, type: 'info' });
  }

  // API-specific error messages
  showApiError(error: any): void {
    if (error.status === 404) {
      this.error(
        'Server route not found — check API base/prefix in .env',
        'API Configuration Error'
      );
    } else if (error.status === 401) {
      this.error(
        'Authentication failed. Please check your credentials.',
        'Login Error'
      );
    } else if (error.status === 403) {
      this.error(
        'Access denied. You don\'t have permission for this action.',
        'Access Denied'
      );
    } else if (error.status >= 500) {
      this.error(
        'Server error. Please try again later.',
        'Server Error'
      );
    } else if (error.code === 'NETWORK_ERROR') {
      this.error(
        'Network error. Please check your internet connection.',
        'Connection Error'
      );
    } else {
      this.error(
        error.message || 'An unexpected error occurred',
        'Error'
      );
    }
  }
}

export const toast = ToastManager.getInstance();
export default toast;
