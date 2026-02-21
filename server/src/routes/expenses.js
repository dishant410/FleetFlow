const express = require('express');
const FuelExpense = require('../models/FuelExpense');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validate');
const { expenseSchema, paginationQuery } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/expenses — List fuel expenses
 */
router.get('/', validateQuery(paginationQuery), async (req, res, next) => {
  try {
    const { page, limit, vehicle } = req.query;
    const query = {};

    if (vehicle) query.vehicle = vehicle;

    const total = await FuelExpense.countDocuments(query);
    const expenses = await FuelExpense.find(query)
      .populate('vehicle', 'name licensePlate')
      .populate('trip', 'referenceId')
      .populate('createdBy', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1 });

    res.json({ expenses, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/expenses — Create a fuel expense (standalone or attached to trip)
 */
router.post(
  '/',
  authorize(['manager', 'dispatcher', 'finance']),
  validateRequest(expenseSchema),
  async (req, res, next) => {
    try {
      const expense = await FuelExpense.create({
        ...req.body,
        createdBy: req.user._id,
        trip: req.body.trip || null,
      });

      const populated = await FuelExpense.findById(expense._id)
        .populate('vehicle', 'name licensePlate')
        .populate('trip', 'referenceId')
        .populate('createdBy', 'name email');

      res.status(201).json({ expense: populated });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
