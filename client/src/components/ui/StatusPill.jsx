import React from 'react';

/**
 * StatusPill — color-coded status badge
 */
const statusColors = {
  // Vehicle statuses
  available: 'bg-green-100 text-green-800',
  on_trip: 'bg-blue-100 text-blue-800',
  in_shop: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-gray-100 text-gray-800',
  out_of_service: 'bg-red-100 text-red-800',
  // Driver statuses
  on_duty: 'bg-blue-100 text-blue-800',
  off_duty: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-800',
  // Trip statuses
  draft: 'bg-gray-100 text-gray-700',
  dispatched: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  // Roles
  manager: 'bg-purple-100 text-purple-800',
  dispatcher: 'bg-blue-100 text-blue-800',
  safety: 'bg-yellow-100 text-yellow-800',
  finance: 'bg-green-100 text-green-800',
};

const statusLabels = {
  available: 'Available',
  on_trip: 'On Trip',
  in_shop: 'In Shop',
  retired: 'Retired',
  out_of_service: 'Out of Service',
  on_duty: 'On Duty',
  off_duty: 'Off Duty',
  suspended: 'Suspended',
  draft: 'Draft',
  dispatched: 'Dispatched',
  completed: 'Completed',
  cancelled: 'Cancelled',
  manager: 'Manager',
  dispatcher: 'Dispatcher',
  safety: 'Safety Officer',
  finance: 'Finance',
};

export default function StatusPill({ status, className = '' }) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-700';
  const label = statusLabels[status] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-60" />
      {label}
    </span>
  );
}
