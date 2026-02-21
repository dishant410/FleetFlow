import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TruckIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KPICard from '../components/ui/KPICard';
import { analyticsAPI } from '../api/endpoints';
import useSocket from '../hooks/useSocket';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const { data } = await analyticsAPI.fleetSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Real-time updates: refresh on any status change
  useSocket({
    'vehicle:update': () => fetchSummary(),
    'trip:created': () => fetchSummary(),
    'trip:dispatched': () => fetchSummary(),
    'trip:completed': () => fetchSummary(),
    'maintenance:added': () => fetchSummary(),
    'driver:update': () => fetchSummary(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const s = summary || {};

  const fleetStatusData = [
    { name: 'Available', value: s.availableVehicles || 0, color: '#22c55e' },
    { name: 'On Trip', value: s.activeFleet || 0, color: '#3b82f6' },
    { name: 'In Shop', value: s.inShop || 0, color: '#eab308' },
    { name: 'Out of Service', value: s.outOfService || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const financialData = [
    { name: 'Revenue', value: s.totalRevenue || 0 },
    { name: 'Fuel', value: s.totalFuelCost || 0 },
    { name: 'Maintenance', value: s.totalMaintenanceCost || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time overview of your fleet operations</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Active Fleet"
          value={s.activeFleet || 0}
          icon={TruckIcon}
          color="blue"
          subtitle={`${s.totalVehicles || 0} total vehicles`}
        />
        <KPICard
          title="In Maintenance"
          value={s.inShop || 0}
          icon={WrenchScrewdriverIcon}
          color="yellow"
          subtitle="Vehicles in shop"
        />
        <KPICard
          title="Utilization"
          value={`${s.utilizationRate || 0}%`}
          icon={ChartBarIcon}
          color="green"
          subtitle="Fleet utilization rate"
        />
        <KPICard
          title="Pending Trips"
          value={s.pendingTrips || 0}
          icon={MapPinIcon}
          color="purple"
          subtitle={`${s.draftTrips || 0} draft, ${s.dispatchedTrips || 0} en route`}
        />
        <KPICard
          title="Drivers"
          value={s.onDutyDrivers || 0}
          icon={UserGroupIcon}
          color="indigo"
          subtitle={`${s.totalDrivers || 0} total drivers`}
        />
        <KPICard
          title="Revenue"
          value={`$${(s.totalRevenue || 0).toLocaleString()}`}
          icon={CurrencyDollarIcon}
          color="green"
          subtitle={`$${(s.totalExpenses || 0).toLocaleString()} expenses`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h3 className="text-base font-semibold text-gray-900 mb-4">Fleet Status Distribution</h3>
          {fleetStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fleetStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No vehicle data available</p>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {fleetStatusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Financial Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-base font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{s.completedTrips || 0}</p>
            <p className="text-xs text-gray-500">Completed Trips</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">${(s.totalRevenue || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Revenue</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">${(s.totalFuelCost || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Fuel Costs</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">${(s.totalMaintenanceCost || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Maintenance Costs</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
