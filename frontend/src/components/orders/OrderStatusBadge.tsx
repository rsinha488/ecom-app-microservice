/**
 * Order Status Badge Component
 *
 * Displays a colored badge for order status with proper styling
 *
 * @component
 */

import React from 'react';
import { getStatusLabel, getStatusBadgeClass, OrderStatus } from '@/constants/orderStatus';

interface OrderStatusBadgeProps {
  status: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * OrderStatusBadge component
 *
 * @param {number} status - Numeric status code (1-5)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Badge size (sm, md, lg)
 *
 * @example
 * <OrderStatusBadge status={OrderStatus.SHIPPED} size="md" />
 */
export default function OrderStatusBadge({ status, className = '', size = 'md' }: OrderStatusBadgeProps) {
  const label = getStatusLabel(status);
  const badgeClass = getStatusBadgeClass(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${badgeClass} ${sizeClasses[size]} ${className}`}
    >
      {label}
    </span>
  );
}
