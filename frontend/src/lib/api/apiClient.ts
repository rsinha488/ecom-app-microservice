/**
 * Enhanced API Client with Global Error Handling
 *
 * Provides:
 * - Automatic token management
 * - Global error handling and transformation
 * - Request/response interceptors
 * - Standardized error format
 * - Toast notifications for errors
 * - Automatic retry logic
 *
 * @module lib/api/apiClient
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { handleAPIError, type APIError } from '@/utils/apiErrorHandler';

// API URLs from environment
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';

export interface APIClientConfig {
  baseURL: string;
  serviceName: string;
  showToastOnError?: boolean;
  showToastOnSuccess?: boolean;
  retryAttempts?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

/**
 * Create an enhanced API client with global error handling
 *
 * @param config - Client configuration
 * @returns Configured axios instance
 */
export function createEnhancedAPIClient(config: APIClientConfig): AxiosInstance {
  const {
    baseURL,
    serviceName,
    showToastOnError = true,
    showToastOnSuccess = false,
    retryAttempts = 1
  } = config;

  // Create axios instance
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token and logging
  client.interceptors.request.use(
    (config) => {
      // Add authentication token
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Log request in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${serviceName}] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });
      }

      return config;
    },
    (error) => {
      console.error(`[${serviceName}] Request error:`, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response: AxiosResponse<APIResponse>) => {
      // Log successful response in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${serviceName}] Response:`, response.data);
      }

      // Show success toast if configured
      if (showToastOnSuccess && response.data.message) {
        // You can integrate with your toast library here
        console.log('Success:', response.data.message);
      }

      return response;
    },
    async (error: AxiosError<APIError>) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[${serviceName}] Error:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });
      }

      // Handle 401 Unauthorized - Token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${AUTH_URL}/api/v1/oauth/token`, {
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
            });

            const { access_token, refresh_token } = response.data;
            localStorage.setItem('accessToken', access_token);
            if (refresh_token) {
              localStorage.setItem('refreshToken', refresh_token);
            }

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (typeof window !== 'undefined') {
            window.location.href = '/login?session=expired';
          }
          return Promise.reject(transformError(refreshError as AxiosError));
        }
      }

      // Handle 503 Service Unavailable - Retry logic
      if (error.response?.status === 503 && retryAttempts > 0) {
        const retryCount = originalRequest._retryCount || 0;
        if (retryCount < retryAttempts) {
          originalRequest._retryCount = retryCount + 1;

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          return client(originalRequest);
        }
      }

      // Transform and handle the error
      const transformedError = transformError(error);

      // Show error toast if configured
      if (showToastOnError) {
        handleAPIError(transformedError, {
          showSuggestion: true,
          redirectOnAuthError: error.response?.status === 401
        });
      }

      return Promise.reject(transformedError);
    }
  );

  return client;
}

/**
 * Transform axios error to standardized API error format
 *
 * @param error - Axios error object
 * @returns Standardized API error
 */
function transformError(error: AxiosError<APIError> | any): APIError {
  // If error is already in API error format
  if (error.response?.data?.success === false) {
    return error.response.data;
  }

  // Network error (no response)
  if (!error.response) {
    return {
      success: false,
      error: 'Network Error',
      message: 'Unable to connect to server. Please check your internet connection.',
      suggestion: 'Try again in a few moments',
      statusCode: 0
    };
  }

  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return {
      success: false,
      error: 'Timeout Error',
      message: 'The request took too long to complete.',
      suggestion: 'Please try again',
      statusCode: 408
    };
  }

  // HTTP error with response
  const status = error.response.status;
  const data = error.response.data;

  // Try to extract error message
  const message = data?.message ||
                  data?.error ||
                  error.message ||
                  'An unexpected error occurred';

  return {
    success: false,
    error: getErrorType(status),
    message,
    suggestion: getErrorSuggestion(status),
    fields: data?.fields,
    statusCode: status
  };
}

/**
 * Get error type based on HTTP status code
 *
 * @param status - HTTP status code
 * @returns Error type string
 */
function getErrorType(status: number): string {
  switch (status) {
    case 400: return 'Validation Error';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Server Error';
    case 503: return 'Service Unavailable';
    default: return 'Error';
  }
}

/**
 * Get helpful suggestion based on HTTP status code
 *
 * @param status - HTTP status code
 * @returns Suggestion string
 */
function getErrorSuggestion(status: number): string {
  switch (status) {
    case 400: return 'Please check your input and try again';
    case 401: return 'Please log in to continue';
    case 403: return 'You don\'t have permission to perform this action';
    case 404: return 'The requested resource was not found';
    case 409: return 'This resource already exists';
    case 422: return 'The operation cannot be completed';
    case 429: return 'Please slow down and try again later';
    case 500: return 'Please try again later or contact support';
    case 503: return 'The service is temporarily unavailable';
    default: return 'Please try again';
  }
}

/**
 * Wrapper for making API requests with better error handling
 *
 * @param client - Axios instance
 * @param config - Request configuration
 * @returns Promise with typed response
 */
export async function makeRequest<T = any>(
  client: AxiosInstance,
  config: AxiosRequestConfig
): Promise<APIResponse<T>> {
  try {
    const response = await client.request<APIResponse<T>>(config);
    return response.data;
  } catch (error) {
    // Error is already transformed by interceptor
    throw error;
  }
}

/**
 * Helper to extract data from API response
 *
 * @param response - API response
 * @returns Data from response
 */
export function extractData<T>(response: APIResponse<T>): T {
  return response.data;
}

/**
 * Helper to check if error is an API error
 *
 * @param error - Error object
 * @returns True if it's an API error
 */
export function isAPIError(error: any): error is APIError {
  return error && typeof error === 'object' && 'success' in error && error.success === false;
}
