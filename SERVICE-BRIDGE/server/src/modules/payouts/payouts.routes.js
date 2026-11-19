import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Payout } from './payout.model.js';
import { Professional } from '../professionals/professional.model.js';
import { AuditLog } from '../admin/auditLog.model.js';

const router = Router();
router.use(protect);

router.get('/mine', authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  if (!pro) return res.json({ success: true, data: { items: [], summary: {} } });
  const items = await Payout.find({ professionalId: pro._id }).sort({ createdAt: -1 }).limit(50).populate({ path: 'bookingId', select: 'requestId', populate: { path: 'requestId', select: 'category' } });
  const live = items.filter((i) => i.status !== 'CANCELLED');
  const sum = (f, list = live) => list.reduce((a, i) => a + i[f], 0);
  res.json({ success: true, data: { items, summary: {
    grossPaise: sum('grossPaise'), commissionPaise: sum('commissionPaise'), netPaise: sum('amountPaise'),
    pendingPaise: sum('amountPaise', live.filter((i) => i.status === 'PENDING')), paidPaise: sum('amountPaise', live.filter((i) => i.status === 'PAID')),
  } } });
}));

router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const items = await Payout.find().sort({ createdAt: -1 }).limit(100).populate({ path: 'professionalId', select: 'userId', populate: { path: 'userId', select: 'name' } });
  res.json({ success: true, data: { items } });
}));

// Settlement is recorded manually in this prototype (no live payout provider is connected)
router.patch('/:id/mark-paid', authorize('admin'), validate(z.object({ reference: z.string().trim().min(3).max(80) })), asyncHandler(async (req, res) => {
  const p = await Payout.findOneAndUpdate({ _id: req.params.id, status: 'PENDING' }, { status: 'PAID', reference: req.body.reference, paidAt: new Date() }, { new: true });
  if (!p) throw new ApiError(409, 'Only pending payouts can be marked as paid');
  await AuditLog.create({ adminId: req.user._id, action: 'payout_paid', targetType: 'Payout', targetId: p._id, reason: req.body.reference });
  res.json({ success: true, data: { payout: p } });
}));

export default router;
