const express = require('express');
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const FuelExpense = require('../models/FuelExpense');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validate');
const { tripSchema, completeTripSchema, paginationQuery } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/trips — List trips with filters/pagination
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const { page, limit, status, vehicle, driver, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (vehicle) query.vehicle = vehicle;
    if (driver) query.driver = driver;
    if (search) {
      query.$or = [
        { referenceId: { $regex: search, $options: 'i' } },
        { 'origin.address': { $regex: search, $options: 'i' } },
        { 'destination.address': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Trip.countDocuments(query);
    const trips = await Trip.find(query)
      .populate('vehicle', 'name licensePlate maxLoadKg status')
      .populate('driver', 'name licenseNumber status')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ 'timestamps.createdAt': -1 });

    res.json({ trips, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/trips/:id — Single trip
 */
router.get('/:id', async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicle')
      .populate('driver');
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    res.json({ trip });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/trips — Create a new trip (draft)
 *
 * BUSINESS RULES:
 *   1. cargoWeightKg must be <= vehicle.maxLoadKg (capacity check)
 *   2. Driver's licenseExpiry must be >= today (license check)
 *   3. Driver categories should include vehicle type
 *   4. Vehicle must be 'available'
 *   5. Driver must not be 'suspended'
 */
router.post(
  '/',
  authorize(['manager', 'dispatcher']),
  validateRequest(tripSchema),
  async (req, res, next) => {
    try {
      const { origin, destination, cargoWeightKg, vehicle: vehicleId, driver: driverId, revenue, notes } = req.body;

      // Fetch vehicle and driver
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

      const driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ message: 'Driver not found.' });

      // ── BUSINESS RULE: Capacity check ──
      if (cargoWeightKg > vehicle.maxLoadKg) {
        return res.status(400).json({
          message: `Load exceeds vehicle capacity (${vehicle.maxLoadKg} kg). Choose a different vehicle or reduce load.`,
        });
      }

      // ── BUSINESS RULE: License expiry check ──
      if (new Date(driver.licenseExpiry) < new Date()) {
        return res.status(400).json({
          message: `Driver's license has expired (${driver.licenseExpiry.toISOString().split('T')[0]}). Assignment blocked.`,
        });
      }

      // ── BUSINESS RULE: Driver categories must include vehicle type ──
      if (vehicle.type && driver.categories.length > 0 && !driver.categories.includes(vehicle.type)) {
        return res.status(400).json({
          message: `Driver is not certified for vehicle type "${vehicle.type}". Driver categories: ${driver.categories.join(', ')}.`,
        });
      }

      // ── BUSINESS RULE: Vehicle must be available ──
      if (vehicle.status !== 'available') {
        return res.status(400).json({
          message: `Vehicle is currently "${vehicle.status}" and cannot be assigned to a new trip.`,
        });
      }

      // ── BUSINESS RULE: Driver must not be suspended ──
      if (driver.status === 'suspended') {
        return res.status(400).json({
          message: 'Driver is suspended and cannot be assigned to a trip.',
        });
      }

      const trip = await Trip.create({
        origin,
        destination,
        cargoWeightKg,
        vehicle: vehicleId,
        driver: driverId,
        revenue: revenue || 0,
        notes: notes || '',
        startOdometer: vehicle.odometerKm,
        status: 'draft',
        timestamps: { createdAt: new Date() },
      });

      const populatedTrip = await Trip.findById(trip._id)
        .populate('vehicle', 'name licensePlate')
        .populate('driver', 'name licenseNumber');

      const io = req.app.get('io');
      if (io) io.emit('trip:created', { trip: populatedTrip });

      await AuditLog.create({
        action: 'trip_created',
        entity: 'trip',
        entityId: trip._id,
        performedBy: req.user._id,
        details: { referenceId: trip.referenceId, vehicleId, driverId },
      });

      res.status(201).json({ trip: populatedTrip });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/trips/:id/dispatch — Dispatch a draft trip
 *
 * LIFECYCLE: Draft -> Dispatched
 *   - Set dispatchedAt timestamp
 *   - Set vehicle.status = 'on_trip'
 *   - Set driver.status = 'on_duty'
 *   - Assign vehicle to driver
 */
router.patch(
  '/:id/dispatch',
  authorize(['manager', 'dispatcher']),
  async (req, res, next) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) return res.status(404).json({ message: 'Trip not found.' });
      if (trip.status !== 'draft') {
        return res.status(400).json({ message: `Cannot dispatch trip with status "${trip.status}".` });
      }

      // Use MongoDB session for transactional update
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Update trip
        trip.status = 'dispatched';
        trip.timestamps.dispatchedAt = new Date();
        await trip.save({ session });

        // Update vehicle status to 'on_trip'
        await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'on_trip' }, { session });

        // Update driver status to 'on_duty' and assign vehicle
        await Driver.findByIdAndUpdate(
          trip.driver,
          { status: 'on_duty', assignedVehicle: trip.vehicle },
          { session }
        );

        await session.commitTransaction();
        session.endSession();
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }

      const populatedTrip = await Trip.findById(trip._id)
        .populate('vehicle')
        .populate('driver');

      const io = req.app.get('io');
      if (io) {
        io.emit('trip:dispatched', { trip: populatedTrip });
        io.emit('vehicle:update', { vehicle: populatedTrip.vehicle });
        io.emit('driver:update', { driver: populatedTrip.driver });
      }

      await AuditLog.create({
        action: 'trip_dispatched',
        entity: 'trip',
        entityId: trip._id,
        performedBy: req.user._id,
        details: { referenceId: trip.referenceId },
      });

      res.json({ trip: populatedTrip });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/trips/:id/complete — Complete a dispatched trip
 *
 * LIFECYCLE: Dispatched -> Completed
 *   - Set completedAt, endOdometer
 *   - Update vehicle odometer & status = 'available'
 *   - Set driver.status = 'off_duty', clear assignedVehicle
 *   - Optionally create fuel expense record
 */
router.patch(
  '/:id/complete',
  authorize(['manager', 'dispatcher']),
  validateRequest(completeTripSchema),
  async (req, res, next) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) return res.status(404).json({ message: 'Trip not found.' });
      if (trip.status !== 'dispatched') {
        return res.status(400).json({ message: `Cannot complete trip with status "${trip.status}".` });
      }

      const { endOdometer, fuelLiters, fuelCost } = req.body;

      if (endOdometer < trip.startOdometer) {
        return res.status(400).json({ message: 'End odometer cannot be less than start odometer.' });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Update trip
        trip.status = 'completed';
        trip.timestamps.completedAt = new Date();
        trip.endOdometer = endOdometer;
        await trip.save({ session });

        // Update vehicle: set odometer, status = available
        await Vehicle.findByIdAndUpdate(
          trip.vehicle,
          { odometerKm: endOdometer, status: 'available' },
          { session }
        );

        // Update driver: off_duty, clear assigned vehicle
        await Driver.findByIdAndUpdate(
          trip.driver,
          { status: 'off_duty', assignedVehicle: null },
          { session }
        );

        // Create fuel expense if fuel data provided
        if (fuelLiters > 0 || fuelCost > 0) {
          await FuelExpense.create(
            [
              {
                vehicle: trip.vehicle,
                liters: fuelLiters || 0,
                cost: fuelCost || 0,
                date: new Date(),
                trip: trip._id,
                createdBy: req.user._id,
              },
            ],
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }

      const populatedTrip = await Trip.findById(trip._id)
        .populate('vehicle')
        .populate('driver');

      const io = req.app.get('io');
      if (io) {
        io.emit('trip:completed', { trip: populatedTrip });
        io.emit('vehicle:update', { vehicle: populatedTrip.vehicle });
        io.emit('driver:update', { driver: populatedTrip.driver });
      }

      await AuditLog.create({
        action: 'trip_completed',
        entity: 'trip',
        entityId: trip._id,
        performedBy: req.user._id,
        details: { referenceId: trip.referenceId, endOdometer },
      });

      res.json({ trip: populatedTrip });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/trips/:id/cancel — Cancel a trip
 */
router.patch(
  '/:id/cancel',
  authorize(['manager', 'dispatcher']),
  async (req, res, next) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) return res.status(404).json({ message: 'Trip not found.' });
      if (trip.status === 'completed' || trip.status === 'cancelled') {
        return res.status(400).json({ message: `Cannot cancel trip with status "${trip.status}".` });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const wasDispatched = trip.status === 'dispatched';

        trip.status = 'cancelled';
        trip.timestamps.cancelledAt = new Date();
        await trip.save({ session });

        // If was dispatched, restore vehicle and driver
        if (wasDispatched) {
          await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' }, { session });
          await Driver.findByIdAndUpdate(
            trip.driver,
            { status: 'off_duty', assignedVehicle: null },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }

      const populatedTrip = await Trip.findById(trip._id)
        .populate('vehicle')
        .populate('driver');

      const io = req.app.get('io');
      if (io) io.emit('trip:cancelled', { trip: populatedTrip });

      await AuditLog.create({
        action: 'trip_cancelled',
        entity: 'trip',
        entityId: trip._id,
        performedBy: req.user._id,
      });

      res.json({ trip: populatedTrip });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
