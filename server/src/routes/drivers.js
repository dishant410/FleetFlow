const express = require('express');
const Driver = require('../models/Driver');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validate');
const { driverSchema, updateDriverSchema, driverStatusSchema, paginationQuery } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/drivers — List drivers with pagination/search
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Driver.countDocuments(query);
    const drivers = await Driver.find(query)
      .populate('assignedVehicle', 'name licensePlate')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ drivers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/drivers/:id — Single driver
 */
router.get('/:id', async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('assignedVehicle');
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });
    res.json({ driver });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/drivers — Create driver
 */
router.post(
  '/',
  authorize(['manager', 'dispatcher']),
  validateRequest(driverSchema),
  async (req, res, next) => {
    try {
      const driver = await Driver.create(req.body);

      const io = req.app.get('io');
      if (io) io.emit('driver:update', { driver });

      await AuditLog.create({
        action: 'driver_created',
        entity: 'driver',
        entityId: driver._id,
        performedBy: req.user._id,
        details: { name: driver.name },
      });

      res.status(201).json({ driver });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/drivers/:id — Update driver
 */
router.put(
  '/:id',
  authorize(['manager', 'dispatcher']),
  validateRequest(updateDriverSchema),
  async (req, res, next) => {
    try {
      const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).populate('assignedVehicle');
      if (!driver) return res.status(404).json({ message: 'Driver not found.' });

      const io = req.app.get('io');
      if (io) io.emit('driver:update', { driver });

      res.json({ driver });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/drivers/:id/status — Change driver status
 */
router.patch(
  '/:id/status',
  authorize(['manager', 'dispatcher', 'safety']),
  validateRequest(driverStatusSchema),
  async (req, res, next) => {
    try {
      const driver = await Driver.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      if (!driver) return res.status(404).json({ message: 'Driver not found.' });

      const io = req.app.get('io');
      if (io) io.emit('driver:update', { driver });

      await AuditLog.create({
        action: 'driver_status_changed',
        entity: 'driver',
        entityId: driver._id,
        performedBy: req.user._id,
        details: { newStatus: req.body.status },
      });

      res.json({ driver });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
