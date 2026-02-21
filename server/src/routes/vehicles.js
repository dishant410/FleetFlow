const express = require('express');
const Vehicle = require('../models/Vehicle');
const MaintenanceLog = require('../models/MaintenanceLog');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validate');
const {
  vehicleSchema,
  updateVehicleSchema,
  vehicleStatusSchema,
  maintenanceSchema,
  paginationQuery,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/vehicles — List vehicles with pagination, filters
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const { page, limit, search, status, type } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { licensePlate: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ vehicles, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vehicles/:id — Single vehicle
 */
router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    res.json({ vehicle });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/vehicles — Create vehicle
 */
router.post(
  '/',
  authorize(['manager', 'dispatcher']),
  validateRequest(vehicleSchema),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.create(req.body);

      // Emit socket event
      const io = req.app.get('io');
      if (io) io.emit('vehicle:update', { vehicle });

      await AuditLog.create({
        action: 'vehicle_created',
        entity: 'vehicle',
        entityId: vehicle._id,
        performedBy: req.user._id,
        details: { name: vehicle.name },
      });

      res.status(201).json({ vehicle });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/vehicles/:id — Update vehicle
 */
router.put(
  '/:id',
  authorize(['manager', 'dispatcher']),
  validateRequest(updateVehicleSchema),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

      const io = req.app.get('io');
      if (io) io.emit('vehicle:update', { vehicle });

      res.json({ vehicle });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/vehicles/:id/status — Toggle vehicle status (Out of Service / Retired / Available)
 */
router.patch(
  '/:id/status',
  authorize(['manager', 'dispatcher', 'safety']),
  validateRequest(vehicleStatusSchema),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true }
      );
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

      const io = req.app.get('io');
      if (io) io.emit('vehicle:update', { vehicle });

      await AuditLog.create({
        action: 'vehicle_status_changed',
        entity: 'vehicle',
        entityId: vehicle._id,
        performedBy: req.user._id,
        details: { newStatus: req.body.status },
      });

      res.json({ vehicle });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/vehicles/:id/maintenance
 * BUSINESS RULE: Creates MaintenanceLog AND sets vehicle.status = 'in_shop' atomically.
 * Emits socket event to remove vehicle from dispatch pool.
 */
router.post(
  '/:id/maintenance',
  authorize(['manager', 'dispatcher', 'safety']),
  async (req, res, next) => {
    try {
      const { type, provider, cost, date, resolved } = req.body;

      // Atomic: update vehicle status to 'in_shop'
      const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        { status: 'in_shop' },
        { new: true }
      );
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

      const log = await MaintenanceLog.create({
        vehicle: vehicle._id,
        type: type || 'General',
        provider: provider || '',
        cost: cost || 0,
        date: date || new Date(),
        createdBy: req.user._id,
        resolved: resolved || false,
      });

      // ── Socket: notify all clients that vehicle is now in_shop ──
      const io = req.app.get('io');
      if (io) {
        io.emit('vehicle:update', { vehicle });
        io.emit('maintenance:added', { maintenance: log, vehicle });
      }

      await AuditLog.create({
        action: 'maintenance_created',
        entity: 'vehicle',
        entityId: vehicle._id,
        performedBy: req.user._id,
        details: { maintenanceId: log._id, type: log.type },
      });

      res.status(201).json({ maintenance: log, vehicle });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
