import api from './axios';

// ─── Auth ──────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refresh: (data) => api.post('/auth/refresh', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  me: () => api.get('/auth/me'),
};

// ─── Users ─────────────────────
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
};

// ─── Vehicles ──────────────────
export const vehiclesAPI = {
  list: (params) => api.get('/vehicles', { params }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  updateStatus: (id, status) => api.patch(`/vehicles/${id}/status`, { status }),
  addMaintenance: (id, data) => api.post(`/vehicles/${id}/maintenance`, data),
};

// ─── Drivers ───────────────────
export const driversAPI = {
  list: (params) => api.get('/drivers', { params }),
  get: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  updateStatus: (id, status) => api.patch(`/drivers/${id}/status`, { status }),
};

// ─── Trips ─────────────────────
export const tripsAPI = {
  list: (params) => api.get('/trips', { params }),
  get: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips', data),
  dispatch: (id) => api.patch(`/trips/${id}/dispatch`),
  complete: (id, data) => api.patch(`/trips/${id}/complete`, data),
  cancel: (id) => api.patch(`/trips/${id}/cancel`),
};

// ─── Maintenance ───────────────
export const maintenanceAPI = {
  list: (params) => api.get('/maintenance', { params }),
  create: (data) => api.post('/maintenance', data),
};

// ─── Expenses ──────────────────
export const expensesAPI = {
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
};

// ─── Analytics ─────────────────
export const analyticsAPI = {
  fleetSummary: (params) => api.get('/analytics/fleet/summary', { params }),
  vehicleAnalytics: (id, params) => api.get(`/analytics/vehicle/${id}`, { params }),
};

// ─── Exports ───────────────────
export const exportsAPI = {
  csv: (params) => api.get('/export/csv', { params, responseType: 'blob' }),
  pdf: (params) => api.get('/export/pdf', { params }),
};
