import { Alert } from 'react-native';
import { NetworkError } from './api';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiErrorHandler {
  static handle(error: NetworkError | Error, showAlert: boolean = true): ApiError {
    let apiError: ApiError;

    if (error instanceof NetworkError) {
      apiError = {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
      };
    } else {
      apiError = {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }

    if (showAlert) {
      this.showErrorAlert(apiError);
    }

    return apiError;
  }

  static showErrorAlert(error: ApiError) {
    const title = this.getErrorTitle(error);
    const message = this.getErrorMessage(error);

    Alert.alert(title, message, [
      {
        text: 'OK',
        style: 'default',
      },
    ]);
  }

  static getErrorTitle(error: ApiError): string {
    switch (error.status) {
      case 400:
        return 'Invalid Request';
      case 401:
        return 'Authentication Required';
      case 403:
        return 'Access Denied';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Validation Error';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Server Error';
      case 502:
        return 'Service Unavailable';
      case 503:
        return 'Service Temporarily Unavailable';
      default:
        return 'Error';
    }
  }

  static getErrorMessage(error: ApiError): string {
    if (error.message) {
      return error.message;
    }

    switch (error.status) {
      case 400:
        return 'The request was invalid. Please check your input and try again.';
      case 401:
        return 'You need to log in to access this feature.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'Please check your input and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Something went wrong on our end. Please try again later.';
      case 502:
        return 'The service is temporarily unavailable. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  static isNetworkError(error: any): boolean {
    return error instanceof NetworkError || 
           error.code === 'NETWORK_ERROR' ||
           error.message?.includes('Network Error') ||
           error.message?.includes('fetch');
  }

  static isAuthError(error: any): boolean {
    return error.status === 401 || error.status === 403;
  }

  static isValidationError(error: any): boolean {
    return error.status === 400 || error.status === 422;
  }

  static isServerError(error: any): boolean {
    return error.status >= 500 && error.status < 600;
  }
}

export default ApiErrorHandler;
