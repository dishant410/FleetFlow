const Joi = require('joi');

// ─── Auth ───────────────────────────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('manager', 'dispatcher', 'safety', 'finance').required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

// ─── User ───────────────────────────────────────────────────────
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('manager', 'dispatcher', 'safety', 'finance').required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('manager', 'dispatcher', 'safety', 'finance'),
  isActive: Joi.boolean(),
});

// ─── Vehicle ────────────────────────────────────────────────────
const vehicleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  model: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('van', 'truck', 'bike', 'car', 'other').default('van'),
  licensePlate: Joi.string().min(1).max(20).required(),
  maxLoadKg: Joi.number().min(0).required(),
  odometerKm: Joi.number().min(0).default(0),
  status: Joi.string().valid('available', 'on_trip', 'in_shop', 'retired', 'out_of_service').default('available'),
  acquisitionCost: Joi.number().min(0).default(0),
  currentLocation: Joi.object({
    lat: Joi.number(),
    lng: Joi.number(),
  }).allow(null),
});

const updateVehicleSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  model: Joi.string().min(1).max(100),
  type: Joi.string().valid('van', 'truck', 'bike', 'car', 'other'),
  licensePlate: Joi.string().min(1).max(20),
  maxLoadKg: Joi.number().min(0),
  odometerKm: Joi.number().min(0),
  status: Joi.string().valid('available', 'on_trip', 'in_shop', 'retired', 'out_of_service'),
  acquisitionCost: Joi.number().min(0),
  currentLocation: Joi.object({
    lat: Joi.number(),
    lng: Joi.number(),
  }).allow(null),
});

const vehicleStatusSchema = Joi.object({
  status: Joi.string().valid('available', 'on_trip', 'in_shop', 'retired', 'out_of_service').required(),
});

// ─── Driver ─────────────────────────────────────────────────────
const driverSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  licenseNumber: Joi.string().min(1).max(50).required(),
  licenseExpiry: Joi.date().required(),
  categories: Joi.array().items(Joi.string()).default([]),
  status: Joi.string().valid('on_duty', 'off_duty', 'suspended').default('off_duty'),
});

const updateDriverSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  licenseNumber: Joi.string().min(1).max(50),
  licenseExpiry: Joi.date(),
  categories: Joi.array().items(Joi.string()),
  status: Joi.string().valid('on_duty', 'off_duty', 'suspended'),
});

const driverStatusSchema = Joi.object({
  status: Joi.string().valid('on_duty', 'off_duty', 'suspended').required(),
});

// ─── Trip ───────────────────────────────────────────────────────
const tripSchema = Joi.object({
  origin: Joi.object({
    address: Joi.string().required(),
    lat: Joi.number().default(0),
    lng: Joi.number().default(0),
  }).required(),
  destination: Joi.object({
    address: Joi.string().required(),
    lat: Joi.number().default(0),
    lng: Joi.number().default(0),
  }).required(),
  cargoWeightKg: Joi.number().min(0).required(),
  vehicle: Joi.string().required(),
  driver: Joi.string().required(),
  revenue: Joi.number().min(0).default(0),
  notes: Joi.string().allow('').default(''),
});

const completeTripSchema = Joi.object({
  endOdometer: Joi.number().min(0).required(),
  fuelLiters: Joi.number().min(0).default(0),
  fuelCost: Joi.number().min(0).default(0),
});

// ─── Maintenance ────────────────────────────────────────────────
const maintenanceSchema = Joi.object({
  vehicle: Joi.string().required(),
  type: Joi.string().min(1).max(200).required(),
  provider: Joi.string().allow('').default(''),
  cost: Joi.number().min(0).required(),
  date: Joi.date().required(),
  resolved: Joi.boolean().default(false),
});

// ─── Expense ────────────────────────────────────────────────────
const expenseSchema = Joi.object({
  vehicle: Joi.string().required(),
  liters: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
  date: Joi.date().required(),
  trip: Joi.string().allow(null, '').default(null),
});

// ─── Query helpers ──────────────────────────────────────────────
const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').default(''),
  status: Joi.string().allow('').default(''),
  type: Joi.string().allow('').default(''),
  vehicle: Joi.string().allow('').default(''),
  driver: Joi.string().allow('').default(''),
  from: Joi.date().allow('').default(''),
  to: Joi.date().allow('').default(''),
  sort: Joi.string().allow('').default(''),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  createUserSchema,
  updateUserSchema,
  vehicleSchema,
  updateVehicleSchema,
  vehicleStatusSchema,
  driverSchema,
  updateDriverSchema,
  driverStatusSchema,
  tripSchema,
  completeTripSchema,
  maintenanceSchema,
  expenseSchema,
  paginationQuery,
};
