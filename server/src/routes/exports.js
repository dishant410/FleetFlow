const express = require('express');
const { createObjectCsvStringifier } = require('csv-writer');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const FuelExpense = require('../models/FuelExpense');
const MaintenanceLog = require('../models/MaintenanceLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/export/csv?model=trips|vehicles|drivers|expenses|maintenance&from=&to=
 * Streams a CSV file
 */
router.get('/csv', async (req, res, next) => {
  try {
    const { model, from, to } = req.query;
    let data = [];
    let headers = [];

    switch (model) {
      case 'trips': {
        const query = {};
        if (from || to) {
          query['timestamps.createdAt'] = {};
          if (from) query['timestamps.createdAt'].$gte = new Date(from);
          if (to) query['timestamps.createdAt'].$lte = new Date(to);
        }
        const trips = await Trip.find(query).populate('vehicle', 'name').populate('driver', 'name').lean();
        headers = [
          { id: 'referenceId', title: 'Reference ID' },
          { id: 'origin', title: 'Origin' },
          { id: 'destination', title: 'Destination' },
          { id: 'cargoWeightKg', title: 'Cargo (kg)' },
          { id: 'vehicle', title: 'Vehicle' },
          { id: 'driver', title: 'Driver' },
          { id: 'status', title: 'Status' },
          { id: 'revenue', title: 'Revenue' },
          { id: 'startOdometer', title: 'Start Odometer' },
          { id: 'endOdometer', title: 'End Odometer' },
        ];
        data = trips.map((t) => ({
          referenceId: t.referenceId,
          origin: t.origin?.address || '',
          destination: t.destination?.address || '',
          cargoWeightKg: t.cargoWeightKg,
          vehicle: t.vehicle?.name || '',
          driver: t.driver?.name || '',
          status: t.status,
          revenue: t.revenue,
          startOdometer: t.startOdometer,
          endOdometer: t.endOdometer,
        }));
        break;
      }
      case 'vehicles': {
        const vehicles = await Vehicle.find().lean();
        headers = [
          { id: 'name', title: 'Name' },
          { id: 'model', title: 'Model' },
          { id: 'licensePlate', title: 'License Plate' },
          { id: 'maxLoadKg', title: 'Max Load (kg)' },
          { id: 'odometerKm', title: 'Odometer (km)' },
          { id: 'status', title: 'Status' },
          { id: 'acquisitionCost', title: 'Acquisition Cost' },
        ];
        data = vehicles;
        break;
      }
      case 'drivers': {
        const drivers = await Driver.find().lean();
        headers = [
          { id: 'name', title: 'Name' },
          { id: 'licenseNumber', title: 'License Number' },
          { id: 'licenseExpiry', title: 'License Expiry' },
          { id: 'categories', title: 'Categories' },
          { id: 'status', title: 'Status' },
        ];
        data = drivers.map((d) => ({
          ...d,
          categories: (d.categories || []).join(', '),
          licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry).toISOString().split('T')[0] : '',
        }));
        break;
      }
      case 'expenses': {
        const expenses = await FuelExpense.find().populate('vehicle', 'name').lean();
        headers = [
          { id: 'vehicle', title: 'Vehicle' },
          { id: 'liters', title: 'Liters' },
          { id: 'cost', title: 'Cost' },
          { id: 'date', title: 'Date' },
        ];
        data = expenses.map((e) => ({
          vehicle: e.vehicle?.name || '',
          liters: e.liters,
          cost: e.cost,
          date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
        }));
        break;
      }
      case 'maintenance': {
        const logs = await MaintenanceLog.find().populate('vehicle', 'name').lean();
        headers = [
          { id: 'vehicle', title: 'Vehicle' },
          { id: 'type', title: 'Type' },
          { id: 'provider', title: 'Provider' },
          { id: 'cost', title: 'Cost' },
          { id: 'date', title: 'Date' },
          { id: 'resolved', title: 'Resolved' },
        ];
        data = logs.map((l) => ({
          vehicle: l.vehicle?.name || '',
          type: l.type,
          provider: l.provider,
          cost: l.cost,
          date: l.date ? new Date(l.date).toISOString().split('T')[0] : '',
          resolved: l.resolved ? 'Yes' : 'No',
        }));
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid model. Use: trips, vehicles, drivers, expenses, maintenance' });
    }

    const csvStringifier = createObjectCsvStringifier({ header: headers });
    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${model}-export-${Date.now()}.csv`);
    res.send(csvString);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/export/pdf?type=monthly_audit&month=2025-07
 * Returns a simple HTML-to-text summary (Puppeteer PDF generation is optional)
 */
router.get('/pdf', async (req, res, next) => {
  try {
    const { type } = req.query;

    // Build a summary report
    const [vehicleCount, driverCount, tripCount, totalRevenue, totalExpenses] = await Promise.all([
      Vehicle.countDocuments(),
      Driver.countDocuments(),
      Trip.countDocuments({ status: 'completed' }),
      Trip.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$revenue' } } }]),
      FuelExpense.aggregate([{ $group: { _id: null, total: { $sum: '$cost' } } }]),
    ]);

    const report = {
      title: `FleetFlow ${type || 'Summary'} Report`,
      generatedAt: new Date().toISOString(),
      vehicles: vehicleCount,
      drivers: driverCount,
      completedTrips: tripCount,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalFuelExpenses: totalExpenses[0]?.total || 0,
    };

    // Return JSON report (can be rendered to PDF on client with jsPDF)
    res.json(report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
