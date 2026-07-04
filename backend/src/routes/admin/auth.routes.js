const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { success } = require('../../utils/responseEnvelope');

const router = express.Router();

/**
 * @openapi
 * /admin/auth/login:
 *   post:
 *     summary: Admin login - returns a JWT used for all other /admin routes.
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('email and password are required', 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json(success({ token, email: user.email, role: user.role }));
  })
);

module.exports = router;
