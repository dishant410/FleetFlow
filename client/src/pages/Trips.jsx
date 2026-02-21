import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowDownTrayIcon, PaperAirplaneIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import StatusPill from '../components/ui/StatusPill';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { tripsAPI, vehiclesAPI, driversAPI, exportsAPI } from '../api/endpoints';
import useFetchPaged from '../hooks/useFetchPaged';
import useSocket from '../hooks/useSocket';

const EMPTY_FORM = {
  originAddress: '', destAddress: '', cargoWeightKg: '', vehicle: '', driver: '', revenue: '', notes: '',
};

export default function Trips() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [completeForm, setCompleteForm] = useState({ endOdometer: '', fuelLiters: '', fuelCost: '' });
  const [completeTripId, setCompleteTripId] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filters = { search, status: statusFilter };
  const { data: trips, total, page, totalPages, loading, refresh, goToPage } =
    useFetchPaged(tripsAPI.list, filters, 'trips');

  useSocket({
    'trip:created': () => refresh(),
    'trip:dispatched': () => refresh(),
    'trip:completed': () => refresh(),
    'trip:cancelled': () => refresh(),
  });

  const loadFormData = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        vehiclesAPI.list({ limit: 100, status: 'available' }),
        driversAPI.list({ limit: 100 }),
      ]);
      setVehicles(vRes.data.vehicles || []);
      setDrivers(dRes.data.drivers || []);
    } catch (err) {
      console.error('Failed to load form data', err);
    }
  };

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setFormError('');
    await loadFormData();
    setModalOpen(true);
  };

  const selectedVehicle = vehicles.find((v) => v._id === form.vehicle);
  const selectedDriver = drivers.find((d) => d._id === form.driver);

  // ── BUSINESS RULE: Inline validation for capacity ──
  useEffect(() => {
    if (selectedVehicle && form.cargoWeightKg && Number(form.cargoWeightKg) > selectedVehicle.maxLoadKg) {
      setFormError(`Load exceeds vehicle capacity (${selectedVehicle.maxLoadKg} kg). Choose different vehicle or reduce load.`);
    } else if (selectedDriver && new Date(selectedDriver.licenseExpiry) < new Date()) {
      const days = Math.floor((new Date() - new Date(selectedDriver.licenseExpiry)) / (1000 * 60 * 60 * 24));
      setFormError(`Driver's license expired ${days} days ago — assignment blocked.`);
    } else {
      setFormError('');
    }
  }, [form.cargoWeightKg, form.vehicle, form.driver, selectedVehicle, selectedDriver]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formError) return;
    setSaving(true);
    try {
      const payload = {
        origin: { address: form.originAddress, lat: 0, lng: 0 },
        destination: { address: form.destAddress, lat: 0, lng: 0 },
        cargoWeightKg: Number(form.cargoWeightKg),
        vehicle: form.vehicle,
        driver: form.driver,
        revenue: Number(form.revenue) || 0,
        notes: form.notes,
      };
      const { data } = await tripsAPI.create(payload);
      toast.success(`Trip ${data.trip.referenceId} created`);

      // Auto-dispatch
      await tripsAPI.dispatch(data.trip._id);
      toast.success('Trip dispatched!');

      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (trip) => {
    setCompleteTripId(trip._id);
    setCompleteForm({ endOdometer: trip.startOdometer || '', fuelLiters: '', fuelCost: '' });
    setCompleteModalOpen(true);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tripsAPI.complete(completeTripId, {
        endOdometer: Number(completeForm.endOdometer),
        fuelLiters: Number(completeForm.fuelLiters) || 0,
        fuelCost: Number(completeForm.fuelCost) || 0,
      });
      toast.success('Trip completed!');
      setCompleteModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete trip');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelConfirm) return;
    try {
      await tripsAPI.cancel(cancelConfirm._id);
      toast.success('Trip cancelled.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleDispatch = async (tripId) => {
    try {
      await tripsAPI.dispatch(tripId);
      toast.success('Trip dispatched');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch');
    }
  };

  const exportCSV = async () => {
    try {
      const { data } = await exportsAPI.csv({ model: 'trips' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'trips.csv'; a.click();
    } catch { toast.error('Export failed'); }
  };

  const isDriverExpired = (d) => d.licenseExpiry && new Date(d.licenseExpiry) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Management</h1>
          <p className="text-sm text-gray-500">Dispatch and manage trips</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Export
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> New Trip
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Search trips..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ref</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Origin → Dest</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : trips.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No trips found</td></tr>
              ) : (
                trips.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{t.referenceId}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">
                      {t.origin?.address} → {t.destination?.address}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{t.cargoWeightKg} kg</td>
                    <td className="px-4 py-3 text-gray-600">{t.vehicle?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.driver?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">${(t.revenue || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === 'draft' && (
                          <button onClick={() => handleDispatch(t._id)} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                            <PaperAirplaneIcon className="h-3.5 w-3.5" /> Dispatch
                          </button>
                        )}
                        {t.status === 'dispatched' && (
                          <button onClick={() => openComplete(t)} className="text-xs text-green-600 hover:underline flex items-center gap-0.5">
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Complete
                          </button>
                        )}
                        {(t.status === 'draft' || t.status === 'dispatched') && (
                          <button onClick={() => setCancelConfirm(t)} className="text-xs text-red-600 hover:underline flex items-center gap-0.5 ml-1">
                            <XCircleIcon className="h-3.5 w-3.5" /> Cancel
                          </button>
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

      {/* Create Trip Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create & Dispatch Trip" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Origin Address *</label>
              <input value={form.originAddress} onChange={(e) => setForm({ ...form, originAddress: e.target.value })} className="input-field" required placeholder="123 Main St" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Address *</label>
              <input value={form.destAddress} onChange={(e) => setForm({ ...form, destAddress: e.target.value })} className="input-field" required placeholder="456 Oak Ave" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
              <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className="input-field" required>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} — Max: {v.maxLoadKg}kg | {v.odometerKm?.toLocaleString()}km | {v.type}
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="text-xs text-gray-400 mt-1">
                  Max load: {selectedVehicle.maxLoadKg} kg | Status: {selectedVehicle.status} | Odometer: {selectedVehicle.odometerKm?.toLocaleString()} km
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver *</label>
              <select value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} className="input-field" required>
                <option value="">Select driver</option>
                {drivers.filter((d) => d.status !== 'suspended').map((d) => (
                  <option key={d._id} value={d._id} disabled={isDriverExpired(d)}>
                    {d.name} — {(d.categories || []).join(', ')} {isDriverExpired(d) ? '⚠ LICENSE EXPIRED' : ''}
                  </option>
                ))}
              </select>
              {selectedDriver && isDriverExpired(selectedDriver) && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠ Driver's license expires on {new Date(selectedDriver.licenseExpiry).toLocaleDateString()} — assignment blocked.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo Weight (kg) *</label>
              <input type="number" value={form.cargoWeightKg} onChange={(e) => setForm({ ...form, cargoWeightKg: e.target.value })} className="input-field" required min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revenue ($)</label>
              <input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} className="input-field" min="0" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows="2" />
            </div>
          </div>

          {/* Inline error for business rules */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving || !!formError} className="btn-primary text-sm">
              {saving ? 'Creating...' : 'Create & Dispatch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Complete Trip" size="sm">
        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Odometer (km) *</label>
            <input type="number" value={completeForm.endOdometer} onChange={(e) => setCompleteForm({ ...completeForm, endOdometer: e.target.value })} className="input-field" required min="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Liters</label>
              <input type="number" value={completeForm.fuelLiters} onChange={(e) => setCompleteForm({ ...completeForm, fuelLiters: e.target.value })} className="input-field" min="0" step="0.1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Cost ($)</label>
              <input type="number" value={completeForm.fuelCost} onChange={(e) => setCompleteForm({ ...completeForm, fuelCost: e.target.value })} className="input-field" min="0" step="0.01" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setCompleteModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Completing...' : 'Complete Trip'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        onConfirm={handleCancel}
        title="Cancel Trip"
        message={`Cancel trip ${cancelConfirm?.referenceId}? This will restore vehicle and driver availability.`}
        confirmLabel="Cancel Trip"
        danger
      />
    </div>
  );
}
