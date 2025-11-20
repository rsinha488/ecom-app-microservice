/**
 * Order Status Select Component
 *
 * Dropdown for selecting and updating order status
 * Only shows valid transitions based on current status
 *
 * @component
 */

import React from 'react';
import {
  getAllowedNextStatusesInfo,
  getStatusLabel,
  OrderStatus,
  type OrderStatusInfo
} from '@/constants/orderStatus';

interface OrderStatusSelectProps {
  currentStatus: number;
  onChange: (newStatus: number) => void;
  disabled?: boolean;
  className?: string;
  showCurrentStatus?: boolean;
}

/**
 * OrderStatusSelect component
 *
 * @param {number} currentStatus - Current order status code
 * @param {Function} onChange - Callback when status is changed
 * @param {boolean} disabled - Whether the select is disabled
 * @param {string} className - Additional CSS classes
 * @param {boolean} showCurrentStatus - Whether to include current status in options
 *
 * @example
 * <OrderStatusSelect
 *   currentStatus={OrderStatus.PENDING}
 *   onChange={(newStatus) => handleStatusUpdate(newStatus)}
 * />
 */
export default function OrderStatusSelect({
  currentStatus,
  onChange,
  disabled = false,
  className = '',
  showCurrentStatus = true
}: OrderStatusSelectProps) {
  const allowedStatuses = getAllowedNextStatusesInfo(currentStatus);

  // If no transitions are allowed (final states), show disabled select
  if (allowedStatuses.length === 0) {
    return (
      <select
        disabled
        className={`px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed ${className}`}
        value={currentStatus}
      >
        <option>{getStatusLabel(currentStatus)} (Final)</option>
      </select>
    );
  }

  // Build options list
  const options: OrderStatusInfo[] = showCurrentStatus
    ? [
        {
          code: currentStatus,
          string: '',
          label: getStatusLabel(currentStatus),
          color: 'gray' as const,
          description: ''
        },
        ...allowedStatuses
      ]
    : allowedStatuses;

  return (
    <select
      value={currentStatus}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
    >
      {options.map((status) => (
        <option key={status.code} value={status.code}>
          {status.label}
          {status.code === currentStatus ? ' (Current)' : ''}
        </option>
      ))}
    </select>
  );
}
