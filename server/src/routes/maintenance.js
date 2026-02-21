const express = require('express');
const MaintenanceLog = require('../models/MaintenanceLog');
const Vehicle = require('../models/Vehicle');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validate');
const { maintenanceSchema, paginationQuery } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/maintenance — List maintenance logs
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const { page, limit, vehicle, search } = req.query;
    const query = {};

    if (vehicle) query.vehicle = vehicle;
    if (search) {
      query.$or = [
        { type: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await MaintenanceLog.countDocuments(query);
    const logs = await MaintenanceLog.find(query)
      .populate('vehicle', 'name licensePlate')
      .populate('createdBy', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1 });

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/maintenance — Create a standalone maintenance log
 * BUSINESS RULE: Sets vehicle.status = 'in_shop' and emits socket event
 */
router.post(
  '/',
  authorize(['manager', 'dispatcher', 'safety']),
  validateRequest(maintenanceSchema),
  async (req, res, next) => {
    try {
      const { vehicle: vehicleId, type, provider, cost, date, resolved } = req.body;

      // Update vehicle to in_shop
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { status: 'in_shop' },
        { new: true }
      );
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

      const log = await MaintenanceLog.create({
        vehicle: vehicleId,
        type,
        provider,
        cost,
        date,
        createdBy: req.user._id,
        resolved: resolved || false,
      });

      const populated = await MaintenanceLog.findById(log._id)
        .populate('vehicle', 'name licensePlate')
        .populate('createdBy', 'name email');

      const io = req.app.get('io');
      if (io) {
        io.emit('vehicle:update', { vehicle });
        io.emit('maintenance:added', { maintenance: populated, vehicle });
      }

      await AuditLog.create({
        action: 'maintenance_created',
        entity: 'maintenance',
        entityId: log._id,
        performedBy: req.user._id,
        details: { vehicleId, type },
      });

      res.status(201).json({ maintenance: populated });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
