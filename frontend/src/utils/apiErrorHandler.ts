/**
 * API Error Handler Utility
 *
 * Handles backend API errors and provides user-friendly messages
 *
 * @module utils/apiErrorHandler
 * @version 1.0.0
 */

/**
 * Standard API Error Response from Backend
 */
export interface APIError {
  success: false;
  error: string;
  message: string;
  suggestion?: string;
  fields?: Record<string, string | null>;
  statusCode?: number;
}

/**
 * Axios Error with API Error Response
 */
export interface AxiosAPIError {
  response?: {
    status: number;
    data: APIError | any;
  };
  request?: any;
  message?: string;
  code?: string;
}

/**
 * Extract user-friendly error message from API response
 *
 * Handles various error formats and provides fallback messages
 *
 * @param {any} error - Error object from API call
 * @returns {string} User-friendly error message
 *
 * @example
 * try {
 *   await api.post('/auth/login', credentials);
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast.error(message);
 * }
 */
export function getErrorMessage(error: any): string {
  // Check if this is an Axios error with response
  if (error.response?.data) {
    const data = error.response.data;

    // Priority 1: Use custom message from backend
    if (data.message) {
      return data.message;
    }

    // Priority 2: Field-level errors (for validation errors)
    if (data.fields && typeof data.fields === 'object') {
      const fieldErrors = Object.values(data.fields)
        .filter((msg): msg is string => msg !== null && msg !== undefined && msg !== '');

      if (fieldErrors.length > 0) {
        // Return first error or combine multiple errors
        return fieldErrors.length === 1
          ? fieldErrors[0]
          : `Multiple errors: ${fieldErrors.join(', ')}`;
      }
    }

    // Priority 3: Error type from backend
    if (data.error) {
      return data.error;
    }

    // Priority 4: Error description (OAuth2 errors)
    if (data.error_description) {
      return data.error_description;
    }
  }

  // Network errors (no response from server)
  if (!error.response && error.request) {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  // Canceled requests
  if (error.message === 'canceled' || error.code === 'ERR_CANCELED') {
    return 'Request was canceled.';
  }

  // Generic axios error message
  if (error.message) {
    return error.message;
  }

  // Ultimate fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get suggestion/help text from API error
 *
 * @param {any} error - Error object from API call
 * @returns {string | null} Suggestion text or null
 *
 * @example
 * const suggestion = getErrorSuggestion(error);
 * if (suggestion) {
 *   toast.info(suggestion);
 * }
 */
export function getErrorSuggestion(error: any): string | null {
  return error.response?.data?.suggestion || null;
}

/**
 * Get field-level validation errors
 *
 * @param {any} error - Error object from API call
 * @returns {Record<string, string> | null} Field errors or null
 *
 * @example
 * const fieldErrors = getFieldErrors(error);
 * if (fieldErrors) {
 *   Object.keys(fieldErrors).forEach(field => {
 *     setError(field, { message: fieldErrors[field] });
 *   });
 * }
 */
export function getFieldErrors(error: any): Record<string, string> | null {
  const fields = error.response?.data?.fields;

  if (!fields || typeof fields !== 'object') {
    return null;
  }

  // Filter out null values
  const filteredFields: Record<string, string> = {};
  Object.keys(fields).forEach(key => {
    if (fields[key]) {
      filteredFields[key] = fields[key];
    }
  });

  return Object.keys(filteredFields).length > 0 ? filteredFields : null;
}

/**
 * Check if error is an authentication error (401)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if authentication error
 *
 * @example
 * if (isAuthError(error)) {
 *   // Redirect to login
 *   router.push('/login');
 * }
 */
export function isAuthError(error: any): boolean {
  return error.response?.status === 401;
}

/**
 * Check if error is a permission error (403)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if permission error
 *
 * @example
 * if (isPermissionError(error)) {
 *   toast.error('You do not have permission for this action');
 * }
 */
export function isPermissionError(error: any): boolean {
  return error.response?.status === 403;
}

/**
 * Check if error is a not found error (404)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if not found error
 */
export function isNotFoundError(error: any): boolean {
  return error.response?.status === 404;
}

/**
 * Check if error is a validation error (400)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if validation error
 */
export function isValidationError(error: any): boolean {
  return error.response?.status === 400;
}

/**
 * Check if error is a conflict error (409)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if conflict error (e.g., duplicate email)
 */
export function isConflictError(error: any): boolean {
  return error.response?.status === 409;
}

/**
 * Check if error is a server error (500)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if server error
 */
export function isServerError(error: any): boolean {
  return error.response?.status === 500;
}

/**
 * Check if error is a network error (no response)
 *
 * @param {any} error - Error object from API call
 * @returns {boolean} True if network error
 */
export function isNetworkError(error: any): boolean {
  return !error.response && !!error.request;
}

/**
 * Get HTTP status code from error
 *
 * @param {any} error - Error object from API call
 * @returns {number | null} Status code or null
 */
export function getStatusCode(error: any): number | null {
  return error.response?.status || null;
}

/**
 * Handle API error with appropriate action
 *
 * This is a comprehensive error handler that can:
 * - Show toast notifications
 * - Redirect to login on auth errors
 * - Set form field errors
 * - Log errors for debugging
 *
 * @param {any} error - Error object from API call
 * @param {Object} options - Error handling options
 * @param {Function} options.toast - Toast notification function
 * @param {Function} options.router - Next.js router for redirects
 * @param {Function} options.setError - React Hook Form setError function
 * @param {boolean} options.showSuggestion - Show suggestion toast (default: true)
 * @param {boolean} options.redirectOnAuthError - Redirect to login on 401 (default: true)
 * @param {Function} options.onAuthError - Custom auth error handler
 * @param {Function} options.onPermissionError - Custom permission error handler
 *
 * @example
 * import { handleAPIError } from '@/utils/apiErrorHandler';
 * import { toast } from 'react-hot-toast';
 * import { useRouter } from 'next/navigation';
 *
 * try {
 *   await api.post('/auth/login', data);
 * } catch (error) {
 *   handleAPIError(error, {
 *     toast,
 *     router,
 *     setError: methods.setError,
 *     showSuggestion: true,
 *     redirectOnAuthError: true
 *   });
 * }
 */
export function handleAPIError(error: any, options: {
  toast?: any;
  router?: any;
  setError?: Function;
  showSuggestion?: boolean;
  redirectOnAuthError?: boolean;
  onAuthError?: () => void;
  onPermissionError?: () => void;
  onNotFoundError?: () => void;
} = {}) {
  const {
    toast,
    router,
    setError,
    showSuggestion = true,
    redirectOnAuthError = true,
    onAuthError,
    onPermissionError,
    onNotFoundError
  } = options;

  // Get error message
  const message = getErrorMessage(error);

  // Show error toast
  if (toast) {
    toast.error(message);

    // Show suggestion if available
    if (showSuggestion) {
      const suggestion = getErrorSuggestion(error);
      if (suggestion) {
        setTimeout(() => {
          toast.info(suggestion, { duration: 5000 });
        }, 500);
      }
    }
  }

  // Set field-level errors for forms
  if (setError) {
    const fieldErrors = getFieldErrors(error);
    if (fieldErrors) {
      Object.keys(fieldErrors).forEach(field => {
        setError(field, {
          type: 'server',
          message: fieldErrors[field]
        });
      });
    }
  }

  // Handle authentication errors
  if (isAuthError(error)) {
    if (onAuthError) {
      onAuthError();
    } else if (redirectOnAuthError && router) {
      // Clear any stored tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }

      // Redirect to login
      router.push('/login');
    }
  }

  // Handle permission errors
  if (isPermissionError(error)) {
    if (onPermissionError) {
      onPermissionError();
    } else if (toast) {
      toast.error('You do not have permission for this action');
    }
  }

  // Handle not found errors
  if (isNotFoundError(error)) {
    if (onNotFoundError) {
      onNotFoundError();
    }
  }

  // Log error for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
    console.error('Error Details:', {
      status: getStatusCode(error),
      message,
      fieldErrors: getFieldErrors(error),
      suggestion: getErrorSuggestion(error)
    });
  }
}

/**
 * Create an error handler for a specific component/page
 *
 * Returns a pre-configured error handler function
 *
 * @param {Object} context - Component context (toast, router, etc.)
 * @returns {Function} Configured error handler
 *
 * @example
 * const LoginPage = () => {
 *   const router = useRouter();
 *   const handleError = createErrorHandler({ toast, router });
 *
 *   const onSubmit = async (data) => {
 *     try {
 *       await api.post('/auth/login', data);
 *     } catch (error) {
 *       handleError(error);
 *     }
 *   };
 * };
 */
export function createErrorHandler(context: {
  toast?: any;
  router?: any;
  setError?: Function;
}) {
  return (error: any, options: Partial<Parameters<typeof handleAPIError>[1]> = {}) => {
    handleAPIError(error, { ...context, ...options });
  };
}

export default {
  getErrorMessage,
  getErrorSuggestion,
  getFieldErrors,
  isAuthError,
  isPermissionError,
  isNotFoundError,
  isValidationError,
  isConflictError,
  isServerError,
  isNetworkError,
  getStatusCode,
  handleAPIError,
  createErrorHandler
};
