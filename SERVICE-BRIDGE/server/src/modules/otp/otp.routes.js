import crypto from 'crypto';
import { Router } from 'express';
import { notify } from '../notifications/notify.js';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { OTPVerification } from './otp.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Professional } from '../professionals/professional.model.js';

const KINDS = {
  arrival: { type: 'ARRIVAL', from: 'CONFIRMED', to: 'IN_PROGRESS' },
  completion: { type: 'COMPLETION', from: 'COMPLETION_PENDING', to: 'COMPLETED' },
};
const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_GENERATIONS = 3;

// Keyed hash: a leaked database alone cannot be used to recover OTPs
const hashOtp = (bookingId, type, otp) =>
  crypto.createHmac('sha256', env.jwtSecret).update(`${bookingId}:${type}:${otp}`).digest('hex');
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const limiter = rateLimit({
  windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: { success: false, message: 'Too many OTP requests. Wait a minute.' },
});

const router = Router();
router.use(protect);

// Customer asks for an OTP to read out to the professional
router.post('/:id/:kind/generate', authorize('customer'), limiter, asyncHandler(async (req, res) => {
  const cfg = KINDS[req.params.kind];
  if (!cfg) throw new ApiError(404, 'Unknown OTP type');
  const b = await Booking.findOne({ _id: req.params.id, customerId: req.user._id });
  if (!b) throw new ApiError(404, 'Booking not found');
  if (b.status !== cfg.from) throw new ApiError(409, `This OTP is only available when the booking is ${cfg.from}`);

  const prior = await OTPVerification.find({ bookingId: b._id, type: cfg.type }).sort({ createdAt: -1 });
  if (prior.length >= MAX_GENERATIONS) throw new ApiError(429, 'OTP limit reached for this booking. Please contact support.');
  if (prior[0] && Date.now() - prior[0].createdAt.getTime() < COOLDOWN_MS) throw new ApiError(429, 'Please wait a minute before requesting a new OTP');

  await OTPVerification.updateMany({ bookingId: b._id, type: cfg.type, usedAt: null, invalidatedAt: null }, { invalidatedAt: new Date() });
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await OTPVerification.create({ bookingId: b._id, type: cfg.type, otpHash: hashOtp(b._id, cfg.type, otp), expiresAt: new Date(Date.now() + TTL_MS) });

  res.set('Cache-Control', 'no-store');
  // MOCK DELIVERY: no SMS provider is connected yet, so the OTP is returned to the customer's screen only
  res.status(201).json({ success: true, data: { otp, expiresInMinutes: 10, delivery: 'mock-in-app', generationsLeft: MAX_GENERATIONS - prior.length - 1 } });
}));

// Professional enters the OTP the customer reads out
router.post('/:id/:kind/verify', authorize('professional'), limiter, validate(z.object({ otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits') })), asyncHandler(async (req, res) => {
  const cfg = KINDS[req.params.kind];
  if (!cfg) throw new ApiError(404, 'Unknown OTP type');
  const pro = await Professional.findOne({ userId: req.user._id });
  const b = pro && (await Booking.findOne({ _id: req.params.id, professionalId: pro._id }));
  if (!b) throw new ApiError(404, 'Booking not found');
  if (b.status !== cfg.from) throw new ApiError(409, `Booking must be ${cfg.from} for this step`);

  const rec = await OTPVerification.findOne({ bookingId: b._id, type: cfg.type, usedAt: null, invalidatedAt: null }).sort({ createdAt: -1 });
  if (!rec) throw new ApiError(400, 'No active OTP. Ask the customer to generate a new one.');
  if (rec.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'OTP expired. Ask the customer for a new one.');

  // Count the attempt first (atomic), so parallel guesses cannot exceed the limit
  const t = await OTPVerification.findOneAndUpdate({ _id: rec._id, usedAt: null, attempts: { $lt: rec.maxAttempts } }, { $inc: { attempts: 1 } }, { new: true });
  if (!t) throw new ApiError(429, 'Too many wrong attempts. Ask the customer for a new OTP.');
  if (!safeEqual(hashOtp(b._id, cfg.type, req.body.otp), t.otpHash)) {
    throw new ApiError(400, `Incorrect OTP. ${t.maxAttempts - t.attempts} attempt(s) left.`);
  }

  // One-time use: only the first correct submission can consume it
  const consumed = await OTPVerification.findOneAndUpdate({ _id: t._id, usedAt: null }, { usedAt: new Date() });
  if (!consumed) throw new ApiError(409, 'This OTP was already used');

  const update = { status: cfg.to, $push: { history: { status: cfg.to, by: req.user._id } } };
  if (cfg.to === 'COMPLETED') update.isActive = false;
  const booking = await Booking.findOneAndUpdate({ _id: b._id, status: cfg.from }, update, { new: true });
  if (!booking) throw new ApiError(409, 'Booking status changed. Refresh and try again.');
  await notify(booking.customerId, { type: 'booking', title: cfg.to === 'IN_PROGRESS' ? 'Work has started' : 'Job completed', body: cfg.to === 'IN_PROGRESS' ? 'Arrival confirmed with your OTP.' : 'You can now pay for the service.', link: '/bookings' });
  res.json({ success: true, data: { booking } });
}));

export default router;
