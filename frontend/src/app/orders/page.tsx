'use client';

import { useEffect, useState } from 'react';
import { Order } from '@/types';
import { FiPackage, FiWifi, FiWifiOff, FiXCircle } from 'react-icons/fi';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { getAccessToken } from '@/lib/cookies';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize WebSocket connection
  const { isConnected, lastEvent } = useOrderSocket(accessToken);

  useEffect(() => {
    // Get access token from cookie
    const token = getAccessToken();
    setAccessToken(token);
    fetchOrders();
  }, []);

  // Update orders when socket events occur
  useEffect(() => {
    if (lastEvent) {
      fetchOrders(); // Refresh orders list when an event occurs
    }
  }, [lastEvent]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('Please log in to view your orders');
        }
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      // New standardized format: data.data.orders contains the orders
      setOrders(data.data?.orders || data.orders || []);
    } catch (err: any) {
      console.error('Orders fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <FiXCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-800 font-medium mb-4">{error}</p>
            {error.includes('log in') && (
              <a
                href="/auth/login"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Go to Login
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiPackage className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">No orders yet</h2>
            <p className="mt-2 text-gray-600">
              Start shopping to place your first order!
            </p>
            <a
              href="/products"
              className="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Browse Products
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>

          {/* WebSocket Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <FiWifi className="h-5 w-5 text-green-600 animate-pulse" />
                <span className="text-sm text-green-600 font-medium">Live Updates Active</span>
              </>
            ) : (
              <>
                <FiWifiOff className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">Connecting...</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Order Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-mono font-semibold text-gray-900">
                      {order.orderNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-bold text-indigo-600">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <OrderStatusBadge status={order.status} size="md" />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="px-6 py-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Shipping Address
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress.street}
                      <br />
                      {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                      {order.shippingAddress.zipCode}
                      <br />
                      {order.shippingAddress.country}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Payment Details
                    </h3>
                    <p className="text-sm text-gray-600">
                      Method:{' '}
                      {order.paymentMethod
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                      <br />
                      Status:{' '}
                      <span
                        className={
                          order.paymentStatus === 'paid'
                            ? 'text-green-600 font-medium'
                            : 'text-yellow-600 font-medium'
                        }
                      >
                        {order.paymentStatus.charAt(0).toUpperCase() +
                          order.paymentStatus.slice(1)}
                      </span>
                    </p>
                    {order.trackingNumber && (
                      <p className="text-sm text-gray-600 mt-2">
                        Tracking: <span className="font-mono">{order.trackingNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
