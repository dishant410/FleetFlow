import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import { expensesAPI, vehiclesAPI, exportsAPI } from '../api/endpoints';
import useFetchPaged from '../hooks/useFetchPaged';

export default function Expenses() {
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicle: '', liters: '', cost: '', date: '', trip: '' });

  const filters = { vehicle: vehicleFilter };
  const { data: expenses, total, page, totalPages, loading, refresh, goToPage } =
    useFetchPaged(expensesAPI.list, filters, 'expenses');

  useEffect(() => {
    vehiclesAPI.list({ limit: 100 }).then(({ data }) => setAllVehicles(data.vehicles || [])).catch(() => {});
  }, []);

  const openCreate = async () => {
    try {
      const { data } = await vehiclesAPI.list({ limit: 100 });
      setVehicles(data.vehicles || []);
    } catch {}
    setForm({ vehicle: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0], trip: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await expensesAPI.create({
        ...form,
        liters: Number(form.liters),
        cost: Number(form.cost),
        trip: form.trip || null,
      });
      toast.success('Expense recorded');
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating expense');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = async () => {
    try {
      const { data } = await exportsAPI.csv({ model: 'expenses' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel & Expenses</h1>
          <p className="text-sm text-gray-500">{total} expense records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Export
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add Expense
          </button>
        </div>
      </div>

      <div>
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Vehicles</option>
          {allVehicles.map((v) => (
            <option key={v._id} value={v._id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Liters</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No expenses found</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{e.vehicle?.name || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{e.liters?.toFixed(1)} L</td>
                    <td className="px-4 py-3 text-right font-medium">${e.cost?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.trip?.referenceId || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.createdBy?.name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Fuel Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
            <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className="input-field" required>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>{v.name} ({v.licensePlate})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Liters *</label>
              <input type="number" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className="input-field" required min="0" step="0.1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($) *</label>
              <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="input-field" required min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
