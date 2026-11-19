import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../users/user.model.js';
import { env } from '../../config/env.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
  password: z.string().min(8).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  role: z.enum(['customer', 'professional']),
  city: z.string().trim().min(2).max(60),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, city: user.city, status: user.status });

function setSession(res, user) {
  const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie('token', token, cookieOptions);
}

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ $or: [{ email }, { phone: req.body.phone }] })) throw new ApiError(409, 'An account with this email or phone already exists');
  const user = await User.create({ ...req.body, email });
  setSession(res, user);
  res.status(201).json({ success: true, data: { user: publicUser(user) } });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) throw new ApiError(401, 'Email or password is incorrect');
  if (user.status !== 'active') throw new ApiError(403, 'This account is unavailable. Contact an administrator.');
  setSession(res, user);
  res.json({ success: true, data: { user: publicUser(user) } });
}));

router.get('/me', protect, (req, res) => res.json({ success: true, data: { user: publicUser(req.user) } }));
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', path: '/' });
  res.json({ success: true, data: { user: null } });
});

export default router;
