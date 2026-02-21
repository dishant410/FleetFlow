const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Trip Model — lifecycle: draft -> dispatched -> completed | cancelled
 * Business rules:
 *   - cargoWeightKg must be <= vehicle.maxLoadKg
 *   - driver license must not be expired
 *   - driver categories should include vehicle type
 */
const tripSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      unique: true,
      default: () => `TRP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    },
    origin: {
      address: { type: String, required: true },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    destination: {
      address: { type: String, required: true },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    cargoWeightKg: { type: Number, required: true, min: 0 },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'dispatched', 'completed', 'cancelled'],
      default: 'draft',
    },
    timestamps: {
      createdAt: { type: Date, default: Date.now },
      dispatchedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      cancelledAt: { type: Date, default: null },
    },
    startOdometer: { type: Number, default: 0 },
    endOdometer: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: false } // We use custom timestamps sub-document
);

tripSchema.index({ status: 1 });
tripSchema.index({ vehicle: 1 });
tripSchema.index({ driver: 1 });
tripSchema.index({ 'timestamps.createdAt': -1 });

module.exports = mongoose.model('Trip', tripSchema);
