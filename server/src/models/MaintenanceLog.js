const mongoose = require('mongoose');

/**
 * MaintenanceLog Model
 * Business rule: Creating a maintenance log sets vehicle.status = 'in_shop' atomically
 * and emits a socket event to remove the vehicle from the dispatch pool.
 */
const maintenanceLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    type: { type: String, required: true, trim: true }, // "Oil Change", "Brake Repair"
    provider: { type: String, trim: true, default: '' },
    cost: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

maintenanceLogSchema.index({ vehicle: 1 });
maintenanceLogSchema.index({ date: -1 });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
