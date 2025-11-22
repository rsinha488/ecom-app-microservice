'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Order } from '@/types';
import {
  FiPackage,
  FiWifi,
  FiWifiOff,
  FiXCircle,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiDollarSign,
  FiMapPin,
  FiCreditCard,
  FiTruck,
  FiRefreshCw
} from 'react-icons/fi';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { getAccessToken } from '@/lib/cookies';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { getPaymentMethodDisplay } from '@/constants/paymentMethod';
import { getPaymentStatusDisplay, getPaymentStatusColor, PaymentStatusCode } from '@/constants/paymentStatus';
import { useAppDispatch } from '@/store';
import { cancelOrder } from '@/store/slices/ordersSlice';
import { toast } from 'react-toastify';

// Status filter options
const STATUS_FILTERS = [
  { value: 'all', label: 'All Orders', color: 'gray' },
  { value: '1', label: 'Pending', color: 'yellow' },
  { value: '2', label: 'Processing', color: 'blue' },
  { value: '3', label: 'Shipped', color: 'purple' },
  { value: '4', label: 'Delivered', color: 'green' },
  { value: '5', label: 'Cancelled', color: 'red' },
];

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<{ id: string; number: string } | null>(null);

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
      setOrders(data.data?.orders || data.orders || []);
    } catch (err: any) {
      console.error('Orders fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    // Use Next.js API route for cancellation
    try {
      setCancellingOrderId(orderId);

      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      const data = await response.json();
      toast.success(`Order #${orderNumber} has been cancelled successfully`);

      // Refresh orders list to show updated status
      await fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Check if order can be cancelled (not delivered or already cancelled)
  const canCancelOrder = (status: number) => {
    return status === 1 || status === 2 || status === 3; // Pending, Processing, or Shipped
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => order != null); // Remove null/undefined orders

    // Filter by status
    if (selectedStatus !== 'all') {
      const statusNumber = parseInt(selectedStatus, 10);
      filtered = filtered.filter(order => order?.status === statusNumber);
    }

    // Filter by search query (order number or product name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order?.orderNumber?.toLowerCase().includes(query) ||
        order?.items?.some(item => item?.productName?.toLowerCase().includes(query))
      );
    }

    // Sort orders
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a?.createdAt || 0).getTime();
        const dateB = new Date(b?.createdAt || 0).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc'
          ? (b?.totalAmount || 0) - (a?.totalAmount || 0)
          : (a?.totalAmount || 0) - (b?.totalAmount || 0);
      }
    });

    return sorted;
  }, [orders, selectedStatus, searchQuery, sortBy, sortOrder]);

  // Stats calculation
  const stats = useMemo(() => {
    const validOrders = orders.filter(o => o != null);
    return {
      total: validOrders.length,
      pending: validOrders.filter(o => o?.status === 1).length,
      processing: validOrders.filter(o => o?.status === 2).length,
      shipped: validOrders.filter(o => o?.status === 3).length,
      delivered: validOrders.filter(o => o?.status === 4).length,
      cancelled: validOrders.filter(o => o?.status === 5).length,
      totalSpent: validOrders.reduce((sum, order) => sum + (order?.totalAmount || 0), 0),
    };
  }, [orders]);

  const handleStatusFilter = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const toggleSort = useCallback(() => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
            <p className="mt-6 text-lg text-gray-600 font-medium">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <FiXCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-red-600 font-medium mb-6">{error}</p>
            {error.includes('log in') ? (
              <a
                href="/auth/login"
                className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Go to Login
              </a>
            ) : (
              <button
                onClick={fetchOrders}
                className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                <FiRefreshCw className="h-5 w-5" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">My Orders</h1>
          <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-indigo-50 rounded-full mb-6">
              <FiPackage className="h-16 w-16 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">No orders yet</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Start shopping to place your first order and track it here!
            </p>
            <a
              href="/products"
              className="inline-block bg-indigo-600 text-white px-10 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Browse Products
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Orders</h1>
              <p className="text-gray-600">Track and manage your order history</p>
            </div>

            {/* WebSocket Connection Status */}
            {/* <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
              {isConnected ? (
                <>
                  <div className="relative">
                    <FiWifi className="h-5 w-5 text-green-600" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                  <span className="text-sm text-green-700 font-semibold">Live Updates</span>
                </>
              ) : (
                <>
                  <FiWifiOff className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Connecting...</span>
                </>
              )}
            </div> */}
          </div>

          {/* Stats Cards */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-600 font-medium mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-yellow-800 font-medium mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-blue-800 font-medium mb-1">Processing</p>
              <p className="text-2xl font-bold text-blue-900">{stats.processing}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-purple-800 font-medium mb-1">Shipped</p>
              <p className="text-2xl font-bold text-purple-900">{stats.shipped}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm border border-green-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-green-800 font-medium mb-1">Delivered</p>
              <p className="text-2xl font-bold text-green-900">{stats.delivered}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-sm border border-indigo-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-indigo-800 font-medium mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-indigo-900">${stats.totalSpent.toFixed(0)}</p>
            </div>
          </div> */}

          {/* Filters and Search */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by order number or product name..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <FiFilter className="h-4 w-4" />
                <span>Filter:</span>
              </div>
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => handleStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedStatus === filter.value
                      ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}

              {/* Sort Controls */}
              <div className="ml-auto flex items-center space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                </select>
                <button
                  onClick={toggleSort}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-all"
                >
                  {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredAndSortedOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FiPackage className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No orders match your filters</p>
            <button
              onClick={() => {
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAndSortedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl">
                        <FiPackage className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Order Number</p>
                        <p className="font-mono font-bold text-lg text-gray-900">
                          {order.orderNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiCalendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Order Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiDollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600">Total Amount</p>
                        <p className="font-bold text-xl text-green-600">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <OrderStatusBadge status={order.status} size="lg" />
                      {canCancelOrder(order.status) && (
                        <button
                          onClick={() => setOrderToCancel({ id: order._id, number: order.orderNumber })}
                          disabled={cancellingOrderId === order._id}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all flex items-center space-x-2"
                        >
                          {cancellingOrderId === order._id ? (
                            <>
                              <FiRefreshCw className="h-4 w-4 animate-spin" />
                              <span>Cancelling...</span>
                            </>
                          ) : (
                            <>
                              <FiXCircle className="h-4 w-4" />
                              <span>Cancel Order</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-6 py-5 bg-white">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                    <FiPackage className="mr-2 h-4 w-4 text-indigo-600" />
                    Order Items ({order.items.length})
                  </h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Qty:</span> {item.quantity} ×
                            <span className="font-medium"> ${item.price.toFixed(2)}</span>
                          </p>
                        </div>
                        <p className="font-bold text-lg text-indigo-600">
                          ${(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping and Payment Info */}
                <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                        <FiMapPin className="mr-2 h-4 w-4 text-indigo-600" />
                        Shipping Address
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {order.shippingAddress.street}<br />
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                        {order.shippingAddress.country}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                        <FiCreditCard className="mr-2 h-4 w-4 text-indigo-600" />
                        Payment & Tracking
                      </h3>
                      <div className="text-sm text-gray-700 space-y-2">
                        <p>
                          <span className="font-medium">Method:</span>{' '}
                          {getPaymentMethodDisplay(order.paymentMethod)}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <span className={`font-bold ${
                            order.paymentStatus === PaymentStatusCode.PAID ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {getPaymentStatusDisplay(order.paymentStatus)}
                          </span>
                        </p>
                        {order.trackingNumber && (
                          <p className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200">
                            <FiTruck className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium">Tracking:</span>
                            <span className="font-mono text-indigo-600 font-bold">{order.trackingNumber}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
              <FiXCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Cancel Order?
            </h3>
            <p className="text-gray-600 text-center mb-2">
              Are you sure you want to cancel order
            </p>
            <p className="text-lg font-mono font-bold text-center text-indigo-600 mb-6">
              #{orderToCancel.number}
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              This action cannot be undone. The order will be marked as cancelled.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setOrderToCancel(null)}
                disabled={cancellingOrderId === orderToCancel.id}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={() => {
                  handleCancelOrder(orderToCancel.id, orderToCancel.number);
                  setOrderToCancel(null);
                }}
                disabled={cancellingOrderId === orderToCancel.id}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {cancellingOrderId === orderToCancel.id ? (
                  <>
                    <FiRefreshCw className="h-4 w-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
