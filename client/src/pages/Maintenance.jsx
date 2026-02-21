import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import StatusPill from '../components/ui/StatusPill';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import { maintenanceAPI, vehiclesAPI, exportsAPI } from '../api/endpoints';
import useFetchPaged from '../hooks/useFetchPaged';
import useSocket from '../hooks/useSocket';

export default function Maintenance() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicle: '', type: '', provider: '', cost: '', date: '', resolved: false });

  const filters = { search };
  const { data: logs, total, page, totalPages, loading, refresh, goToPage } =
    useFetchPaged(maintenanceAPI.list, filters, 'logs');

  useSocket({ 'maintenance:added': () => refresh() });

  const openCreate = async () => {
    try {
      const { data } = await vehiclesAPI.list({ limit: 100 });
      setVehicles(data.vehicles || []);
    } catch {}
    setForm({ vehicle: '', type: '', provider: '', cost: '', date: new Date().toISOString().split('T')[0], resolved: false });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceAPI.create({
        ...form,
        cost: Number(form.cost),
      });
      toast.success('Maintenance log created — vehicle set to In Shop');
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating maintenance log');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = async () => {
    try {
      const { data } = await exportsAPI.csv({ model: 'maintenance' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'maintenance.csv'; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance & Service Logs</h1>
          <p className="text-sm text-gray-500">{total} maintenance records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Export
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add Log
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-xs">
        <SearchBar value={search} onChange={setSearch} placeholder="Search maintenance..." />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No maintenance logs</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{l.vehicle?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{l.type}</td>
                    <td className="px-4 py-3 text-gray-600">{l.provider || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">${l.cost?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{l.date ? new Date(l.date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${l.resolved ? 'text-green-600' : 'text-yellow-600'}`}>
                        {l.resolved ? 'Resolved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{l.createdBy?.name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Maintenance Log">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
            <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className="input-field" required>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>{v.name} ({v.licensePlate})</option>
              ))}
            </select>
            <p className="text-xs text-yellow-600 mt-1">⚠ This will set the vehicle status to "In Shop"</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field" required placeholder="Oil Change, Brake Repair..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="input-field" placeholder="Service Center" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($) *</label>
              <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="input-field" required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.resolved} onChange={(e) => setForm({ ...form, resolved: e.target.checked })} className="rounded border-gray-300 text-primary-600" />
            <span className="text-sm text-gray-700">Mark as resolved</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
