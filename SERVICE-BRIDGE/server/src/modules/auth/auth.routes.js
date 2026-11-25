import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../users/user.model.js';
import { env } from '../../config/env.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createReferralCode } from '../referrals/referralCode.js';
import { Referral } from '../referrals/referral.model.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
  password: z.string().min(8).max(72).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes'),
  role: z.enum(['customer', 'professional']),
  city: z.string().trim().min(2).max(60),
  referralCode: z.string().trim().max(16).optional().or(z.literal('')),
  acceptedTerms: z.boolean().refine((accepted) => accepted, 'You must agree to the Terms & Conditions'),
});
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(256) });
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Wait 15 minutes and try again.' },
});
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, city: user.city, status: user.status });

function setSession(res, user) {
  const token = jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie('token', token, cookieOptions);
}

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ $or: [{ email }, { phone: req.body.phone }] })) throw new ApiError(409, 'An account with this email or phone already exists');
  const { referralCode: enteredCode, ...registration } = req.body;
  delete registration.acceptedTerms;
  const code = enteredCode?.trim().toUpperCase();
  let referrer = null;
  if (code) {
    if (req.body.role !== 'customer') throw new ApiError(400, 'Referral codes are for customer accounts');
    referrer = await User.findOne({ referralCode: code, role: 'customer', status: 'active' }).select('_id');
    if (!referrer) throw new ApiError(400, 'Referral code not found. Check the code and try again.');
  }
  const user = await User.create({
    ...registration,
    email,
    termsAcceptedAt: new Date(),
    termsVersion: 'demo-v1',
    ...(req.body.role === 'customer' ? { referralCode: createReferralCode() } : {}),
  });
  if (referrer) await Referral.create({ referrerUserId: referrer._id, referredUserId: user._id });
  setSession(res, user);
  res.status(201).json({ success: true, data: { user: publicUser(user) } });
}));

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
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
