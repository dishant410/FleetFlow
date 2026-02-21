const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/schemas');

const router = express.Router();

// All user routes require manager role
router.use(authenticate, authorize(['manager']));

/**
 * GET /api/users — List all users
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users — Create user (admin)
 */
router.post('/', validateRequest(createUserSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });

    res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id — Update user
 */
router.put('/:id', validateRequest(updateUserSchema), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id — Soft-delete (deactivate) user
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deactivated.', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
