'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="text-yellow-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Payment Cancelled
        </h1>

        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Your order has been created but not paid. You can complete the payment later from your orders page.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Order ID: {orderId.substring(0, 20)}...
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/checkout"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Try Again
          </Link>

          <Link
            href="/orders"
            className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            View My Orders
          </Link>

          <Link
            href="/"
            className="block w-full text-gray-600 px-6 py-2 hover:text-gray-800 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Having trouble? <Link href="/support" className="text-blue-600 hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
