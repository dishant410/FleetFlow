import React, { useState, useCallback } from 'react';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import StatusPill from '../components/ui/StatusPill';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { vehiclesAPI, exportsAPI } from '../api/endpoints';
import useFetchPaged from '../hooks/useFetchPaged';
import useSocket from '../hooks/useSocket';

const EMPTY_FORM = {
  name: '', model: '', type: 'van', licensePlate: '',
  maxLoadKg: '', odometerKm: 0, acquisitionCost: 0, status: 'available',
};

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const filters = { search, status: statusFilter };
  const { data: vehicles, total, page, totalPages, loading, refresh, goToPage } =
    useFetchPaged(vehiclesAPI.list, filters, 'vehicles');

  // Refresh on socket events
  useSocket({ 'vehicle:update': () => refresh() });

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (v) => {
    setEditId(v._id);
    setForm({
      name: v.name, model: v.model, type: v.type || 'van', licensePlate: v.licensePlate,
      maxLoadKg: v.maxLoadKg, odometerKm: v.odometerKm, acquisitionCost: v.acquisitionCost || 0,
      status: v.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, maxLoadKg: Number(form.maxLoadKg), odometerKm: Number(form.odometerKm), acquisitionCost: Number(form.acquisitionCost) };
      if (editId) {
        await vehiclesAPI.update(editId, payload);
        toast.success('Vehicle updated');
      } else {
        await vehiclesAPI.create(payload);
        toast.success('Vehicle created');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (vehicle, newStatus) => {
    setStatusTarget({ id: vehicle._id, name: vehicle.name, status: newStatus });
    setConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    try {
      await vehiclesAPI.updateStatus(statusTarget.id, statusTarget.status);
      toast.success(`${statusTarget.name} → ${statusTarget.status.replace('_', ' ')}`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  const exportCSV = async () => {
    try {
      const { data } = await exportsAPI.csv({ model: 'vehicles' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'vehicles.csv'; a.click();
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Registry</h1>
          <p className="text-sm text-gray-500">{total} vehicles in fleet</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Export
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Search vehicles..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="on_trip">On Trip</option>
          <option value="in_shop">In Shop</option>
          <option value="retired">Retired</option>
          <option value="out_of_service">Out of Service</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plate</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Max Load</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Odometer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No vehicles found</td></tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600">{v.model}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.licensePlate}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{v.type}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{v.maxLoadKg?.toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-right text-gray-600">{v.odometerKm?.toLocaleString()} km</td>
                    <td className="px-4 py-3"><StatusPill status={v.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(v)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        {v.status === 'available' && (
                          <button onClick={() => handleStatusChange(v, 'out_of_service')} className="text-xs text-red-600 hover:underline ml-2">Disable</button>
                        )}
                        {v.status === 'out_of_service' && (
                          <button onClick={() => handleStatusChange(v, 'available')} className="text-xs text-green-600 hover:underline ml-2">Enable</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} />

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Vehicle' : 'Add Vehicle'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required placeholder="Van-05" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input-field" required placeholder="Ford Transit" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="bike">Bike</option>
                <option value="car">Car</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
              <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} className="input-field" required placeholder="FL-VAN-05" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Load (kg) *</label>
              <input type="number" value={form.maxLoadKg} onChange={(e) => setForm({ ...form, maxLoadKg: e.target.value })} className="input-field" required min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
              <input type="number" value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} className="input-field" min="0" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost ($)</label>
              <input type="number" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} className="input-field" min="0" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status Change Confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmStatusChange}
        title="Change Vehicle Status"
        message={`Set "${statusTarget?.name}" to "${statusTarget?.status?.replace('_', ' ')}"?`}
        danger={statusTarget?.status === 'out_of_service'}
      />
    </div>
  );
}
