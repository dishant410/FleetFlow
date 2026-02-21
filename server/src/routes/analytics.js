const express = require('express');
const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const FuelExpense = require('../models/FuelExpense');
const MaintenanceLog = require('../models/MaintenanceLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/analytics/fleet/summary — Dashboard KPIs
 * Returns: activeFleet, inShop, utilizationRate, pendingTrips, completedTrips, totalRevenue, totalExpenses
 */
router.get('/fleet/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const [
      totalVehicles,
      activeFleet,
      inShop,
      outOfService,
      totalDrivers,
      onDutyDrivers,
      draftTrips,
      dispatchedTrips,
      completedTrips,
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'on_trip' }),
      Vehicle.countDocuments({ status: 'in_shop' }),
      Vehicle.countDocuments({ status: 'out_of_service' }),
      Driver.countDocuments(),
      Driver.countDocuments({ status: 'on_duty' }),
      Trip.countDocuments({ status: 'draft' }),
      Trip.countDocuments({ status: 'dispatched' }),
      Trip.countDocuments({ status: 'completed' }),
    ]);

    // Revenue from completed trips
    const revenueAgg = await Trip.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$revenue' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // Total fuel expenses
    const fuelAgg = await FuelExpense.aggregate([
      { $group: { _id: null, totalCost: { $sum: '$cost' } } },
    ]);
    const totalFuelCost = fuelAgg[0]?.totalCost || 0;

    // Total maintenance expenses
    const maintAgg = await MaintenanceLog.aggregate([
      { $group: { _id: null, totalCost: { $sum: '$cost' } } },
    ]);
    const totalMaintenanceCost = maintAgg[0]?.totalCost || 0;

    const availableVehicles = await Vehicle.countDocuments({ status: 'available' });
    const utilizationRate =
      totalVehicles > 0
        ? (((totalVehicles - availableVehicles) / totalVehicles) * 100).toFixed(1)
        : 0;

    res.json({
      totalVehicles,
      activeFleet,
      inShop,
      outOfService,
      availableVehicles,
      totalDrivers,
      onDutyDrivers,
      draftTrips,
      dispatchedTrips,
      completedTrips,
      pendingTrips: draftTrips + dispatchedTrips,
      utilizationRate: Number(utilizationRate),
      totalRevenue,
      totalFuelCost,
      totalMaintenanceCost,
      totalExpenses: totalFuelCost + totalMaintenanceCost,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/vehicle/:vehicleId — Per-vehicle analytics
 * Returns: costPerKm, fuelEfficiency, ROI, trip count, etc.
 */
router.get('/vehicle/:vehicleId', async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { from, to } = req.query;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const tripFilter = { vehicle: vehicle._id, status: 'completed' };
    const trips = await Trip.find(tripFilter);

    // Total km driven
    const totalKm = trips.reduce((sum, t) => sum + (t.endOdometer - t.startOdometer), 0);

    // Total revenue
    const totalRevenue = trips.reduce((sum, t) => sum + (t.revenue || 0), 0);

    // Fuel expenses for this vehicle
    const fuelExpenses = await FuelExpense.find({ vehicle: vehicle._id });
    const totalFuelCost = fuelExpenses.reduce((sum, e) => sum + e.cost, 0);
    const totalLiters = fuelExpenses.reduce((sum, e) => sum + e.liters, 0);

    // Maintenance costs
    const maintLogs = await MaintenanceLog.find({ vehicle: vehicle._id });
    const totalMaintenanceCost = maintLogs.reduce((sum, m) => sum + m.cost, 0);

    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

    // Fuel Efficiency (km/L) = totalKm / totalLiters
    const fuelEfficiency = totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 0;

    // Cost per km = totalOperationalCost / totalKm
    const costPerKm = totalKm > 0 ? (totalOperationalCost / totalKm).toFixed(2) : 0;

    // Vehicle ROI = (totalRevenue - totalOperationalCost) / acquisitionCost
    const roi =
      vehicle.acquisitionCost > 0
        ? (((totalRevenue - totalOperationalCost) / vehicle.acquisitionCost) * 100).toFixed(2)
        : 0;

    res.json({
      vehicle: {
        _id: vehicle._id,
        name: vehicle.name,
        licensePlate: vehicle.licensePlate,
        acquisitionCost: vehicle.acquisitionCost,
      },
      tripCount: trips.length,
      totalKm,
      totalRevenue,
      totalFuelCost,
      totalLiters,
      totalMaintenanceCost,
      totalOperationalCost,
      fuelEfficiency: Number(fuelEfficiency),
      costPerKm: Number(costPerKm),
      roi: Number(roi),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
