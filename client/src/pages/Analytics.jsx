import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { analyticsAPI, vehiclesAPI, exportsAPI } from '../api/endpoints';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicleAnalytics, setVehicleAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.fleetSummary(),
      vehiclesAPI.list({ limit: 100 }),
    ]).then(([summaryRes, vehiclesRes]) => {
      setSummary(summaryRes.data);
      setVehicles(vehiclesRes.data.vehicles || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVehicle) { setVehicleAnalytics(null); return; }
    analyticsAPI.vehicleAnalytics(selectedVehicle)
      .then(({ data }) => setVehicleAnalytics(data))
      .catch(console.error);
  }, [selectedVehicle]);

  const exportReport = async () => {
    try {
      const { data } = await exportsAPI.pdf({ type: 'monthly_audit' });
      // Download as JSON report
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'fleet-report.json'; a.click();
      toast.success('Report exported');
    } catch { toast.error('Export failed'); }
  };

  const exportCSV = async (model) => {
    try {
      const { data } = await exportsAPI.csv({ model });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = `${model}.csv`; a.click();
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  const s = summary || {};

  const fleetStatusData = [
    { name: 'Available', value: s.availableVehicles || 0 },
    { name: 'On Trip', value: s.activeFleet || 0 },
    { name: 'In Shop', value: s.inShop || 0 },
    { name: 'Out of Service', value: s.outOfService || 0 },
  ].filter((d) => d.value > 0);

  const financialSummary = [
    { name: 'Revenue', amount: s.totalRevenue || 0 },
    { name: 'Fuel Costs', amount: s.totalFuelCost || 0 },
    { name: 'Maintenance', amount: s.totalMaintenanceCost || 0 },
    { name: 'Net Profit', amount: (s.totalRevenue || 0) - (s.totalExpenses || 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm text-gray-500">Operational and financial insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV('trips')} className="btn-secondary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Trips CSV
          </button>
          <button onClick={exportReport} className="btn-primary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Full Report
          </button>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Fleet Efficiency Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={financialSummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Fleet Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={fleetStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label>
                {fleetStatusData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Summary Table */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Financial Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Metric</th>
                <th className="text-right py-2 font-medium text-gray-600">Revenue</th>
                <th className="text-right py-2 font-medium text-gray-600">Fuel Costs</th>
                <th className="text-right py-2 font-medium text-gray-600">Maintenance</th>
                <th className="text-right py-2 font-medium text-gray-600">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 text-gray-700 font-medium">Fleet Total</td>
                <td className="py-3 text-right text-green-600 font-medium">${(s.totalRevenue || 0).toLocaleString()}</td>
                <td className="py-3 text-right text-red-600">${(s.totalFuelCost || 0).toLocaleString()}</td>
                <td className="py-3 text-right text-red-600">${(s.totalMaintenanceCost || 0).toLocaleString()}</td>
                <td className="py-3 text-right font-bold">${((s.totalRevenue || 0) - (s.totalExpenses || 0)).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Vehicle Analytics */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Vehicle Performance Analysis</h3>
        <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} className="input-field w-auto mb-4">
          <option value="">Select a vehicle...</option>
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>{v.name} — {v.licensePlate}</option>
          ))}
        </select>

        {vehicleAnalytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{vehicleAnalytics.tripCount}</p>
              <p className="text-xs text-blue-600">Total Trips</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{vehicleAnalytics.fuelEfficiency} km/L</p>
              <p className="text-xs text-green-600">Fuel Efficiency</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">${vehicleAnalytics.costPerKm}/km</p>
              <p className="text-xs text-purple-600">Cost per km</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-700">{vehicleAnalytics.roi}%</p>
              <p className="text-xs text-indigo-600">ROI</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-gray-700">{vehicleAnalytics.totalKm?.toLocaleString()} km</p>
              <p className="text-xs text-gray-500">Total Distance</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-green-700">${vehicleAnalytics.totalRevenue?.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Revenue</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-red-700">${vehicleAnalytics.totalOperationalCost?.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Costs</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xl font-bold text-gray-700">{vehicleAnalytics.totalLiters?.toFixed(1)} L</p>
              <p className="text-xs text-gray-500">Total Fuel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
