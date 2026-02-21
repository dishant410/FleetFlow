import React, { useState } from 'react';
import { PlusIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import StatusPill from '../components/ui/StatusPill';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import { driversAPI, exportsAPI } from '../api/endpoints';
import useFetchPaged from '../hooks/useFetchPaged';
import useSocket from '../hooks/useSocket';

const EMPTY_FORM = {
  name: '', licenseNumber: '', licenseExpiry: '', categories: '', status: 'off_duty',
};

export default function Drivers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filters = { search, status: statusFilter };
  const { data: drivers, total, page, totalPages, loading, refresh, goToPage } =
    useFetchPaged(driversAPI.list, filters, 'drivers');

  useSocket({ 'driver:update': () => refresh() });

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (d) => {
    setEditId(d._id);
    setForm({
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry).toISOString().split('T')[0] : '',
      categories: (d.categories || []).join(', '),
      status: d.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
      };
      if (editId) {
        await driversAPI.update(editId, payload);
        toast.success('Driver updated');
      } else {
        await driversAPI.create(payload);
        toast.success('Driver created');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving driver');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (driver, newStatus) => {
    try {
      await driversAPI.updateStatus(driver._id, newStatus);
      toast.success(`${driver.name} → ${newStatus.replace('_', ' ')}`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff > 0;
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const exportCSV = async () => {
    try {
      const { data } = await exportsAPI.csv({ model: 'drivers' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'drivers.csv'; a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-sm text-gray-500">{total} drivers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Export
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add Driver
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Search drivers..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Statuses</option>
          <option value="on_duty">On Duty</option>
          <option value="off_duty">Off Duty</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">License #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categories</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No drivers found</td></tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.licenseNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isExpired(d.licenseExpiry) ? 'text-red-600 font-bold' : isExpiringSoon(d.licenseExpiry) ? 'text-yellow-600 font-medium' : 'text-gray-600'}`}>
                        {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : 'N/A'}
                      </span>
                      {isExpired(d.licenseExpiry) && (
                        <span className="ml-1 inline-flex items-center text-xs text-red-600">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5 mr-0.5" /> Expired
                        </span>
                      )}
                      {isExpiringSoon(d.licenseExpiry) && !isExpired(d.licenseExpiry) && (
                        <span className="ml-1 text-xs text-yellow-600">⚠ Expiring soon</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(d.categories || []).map((c) => (
                          <span key={c} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {d.assignedVehicle ? `${d.assignedVehicle.name || d.assignedVehicle.licensePlate || '—'}` : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={d.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(d)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        {d.status !== 'suspended' && (
                          <button onClick={() => handleStatusChange(d, 'suspended')} className="text-xs text-red-600 hover:underline ml-2">Suspend</button>
                        )}
                        {d.status === 'suspended' && (
                          <button onClick={() => handleStatusChange(d, 'off_duty')} className="text-xs text-green-600 hover:underline ml-2">Reinstate</button>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
              <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry *</label>
              <input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
            <input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} className="input-field" placeholder="van, truck, bike (comma-separated)" />
            <p className="text-xs text-gray-400 mt-1">Comma-separated vehicle categories this driver is certified for</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
