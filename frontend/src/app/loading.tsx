/**
 * Global Loading Component
 *
 * Displays during page transitions and data fetching.
 * Provides visual feedback while content is being loaded.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 * @module app/loading
 */

import { FiLoader } from 'react-icons/fi';

/**
 * Global Loading State Component
 *
 * Shown automatically by Next.js during route transitions
 * and Suspense boundaries.
 *
 * @returns Loading UI
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Animated spinner */}
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-indigo-600"></div>
          <FiLoader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-600" />
        </div>

        {/* Loading text */}
        <p className="mt-6 text-gray-600 font-medium">Loading...</p>

        {/* Subtle animation hint */}
        <div className="mt-4 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
}
