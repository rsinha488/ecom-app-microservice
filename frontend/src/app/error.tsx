/**
 * Global Error Boundary
 *
 * Catches and handles errors that occur during rendering in the app.
 * Provides user-friendly error messages and recovery options.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 * @module app/error
 */

'use client';

import { useEffect } from 'react';
import { FiAlertCircle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { logger } from '@/utils/logger';

/**
 * Error boundary props
 */
interface ErrorProps {
  /** The error that was thrown */
  error: Error & { digest?: string };
  /** Function to retry rendering the component */
  reset: () => void;
}

/**
 * Global Error Boundary Component
 *
 * Handles runtime errors in the application and provides recovery options.
 * Logs errors to external monitoring services in production.
 *
 * @param props - Error boundary props
 * @returns Error UI with recovery options
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (Sentry, LogRocket, etc.)
    logger.error('Application error caught by error boundary', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Error Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <FiAlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600">
            We encountered an unexpected error. Don't worry, it's not your fault.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-sm font-semibold text-red-800 mb-2">Error Details:</h2>
            <p className="text-xs text-red-700 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <FiRefreshCw className="w-5 h-5" />
            <span>Try Again</span>
          </button>

          <a
            href="/"
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <FiHome className="w-5 h-5" />
            <span>Go to Homepage</span>
          </a>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          If this problem persists, please{' '}
          <a href="mailto:support@yourdomain.com" className="text-indigo-600 hover:underline">
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}
