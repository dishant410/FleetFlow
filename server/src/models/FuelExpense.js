const mongoose = require('mongoose');

/**
 * FuelExpense Model — tracks fuel costs per vehicle, optionally linked to a trip
 */
const fuelExpenseSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    liters: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

fuelExpenseSchema.index({ vehicle: 1 });
fuelExpenseSchema.index({ trip: 1 });
fuelExpenseSchema.index({ date: -1 });

module.exports = mongoose.model('FuelExpense', fuelExpenseSchema);
