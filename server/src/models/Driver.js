const mongoose = require('mongoose');

/**
 * Driver Model — tracks license, categories, duty status, and vehicle assignment
 */
const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    licenseExpiry: { type: Date, required: true },
    categories: {
      type: [String],
      default: [],
      // e.g. ['van','truck','bike']
    },
    status: {
      type: String,
      enum: ['on_duty', 'off_duty', 'suspended'],
      default: 'off_duty',
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
  },
  { timestamps: true }
);

// Index for quick license-expiry queries
driverSchema.index({ licenseExpiry: 1 });
driverSchema.index({ status: 1 });

module.exports = mongoose.model('Driver', driverSchema);
