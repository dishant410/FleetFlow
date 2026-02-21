const mongoose = require('mongoose');

/**
 * Vehicle Model — fleet registry with status lifecycle and location tracking
 */
const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Van-05"
    model: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['van', 'truck', 'bike', 'car', 'other'],
      default: 'van',
    },
    licensePlate: { type: String, required: true, unique: true, trim: true },
    maxLoadKg: { type: Number, required: true, min: 0 },
    odometerKm: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['available', 'on_trip', 'in_shop', 'retired', 'out_of_service'],
      default: 'available',
    },
    acquisitionCost: { type: Number, default: 0 },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
