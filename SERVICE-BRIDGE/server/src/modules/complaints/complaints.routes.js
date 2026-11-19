import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Complaint } from './complaint.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Professional } from '../professionals/professional.model.js';
import { User } from '../users/user.model.js';
import { AuditLog } from '../admin/auditLog.model.js';
import { notify } from '../notifications/notify.js';

const createSchema = z.object({
  bookingId: z.string().length(24),
  type: z.enum(['service_quality', 'no_show', 'payment', 'behaviour', 'other']),
  description: z.string().trim().min(10, 'Describe the problem in at least 10 characters').max(1000),
});
const updateSchema = z
  .object({ status: z.enum(['UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED']), decision: z.string().trim().max(500).optional() })
  .refine((d) => d.status === 'UNDER_INVESTIGATION' || !!d.decision, { message: 'A decision note is required', path: ['decision'] });
const FROM = { UNDER_INVESTIGATION: ['OPEN'], RESOLVED: ['OPEN', 'UNDER_INVESTIGATION'], REJECTED: ['OPEN', 'UNDER_INVESTIGATION'] };

const router = Router();
router.use(protect);

router.post('/', authorize('customer', 'professional'), validate(createSchema), asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.body.bookingId);
  let against = null;
  if (b && req.user.role === 'customer' && String(b.customerId) === String(req.user._id)) {
    against = (await Professional.findById(b.professionalId))?.userId;
  } else if (b && req.user.role === 'professional') {
    const pro = await Professional.findOne({ userId: req.user._id });
    if (pro && String(pro._id) === String(b.professionalId)) against = b.customerId;
  }
  if (!against) throw new ApiError(404, 'Booking not found'); // also hides other people's bookings
  let item;
  try { item = await Complaint.create({ ...req.body, raisedBy: req.user._id, raisedByRole: req.user.role, againstUserId: against }); }
  catch (e) { if (e.code === 11000) throw new ApiError(409, 'You already have an open complaint for this booking'); throw e; }
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  await Promise.all(admins.map((a) => notify(a._id, { type: 'complaint', title: 'New complaint', body: `${req.user.name} reported a ${req.body.type.replace('_', ' ')} issue.`, link: '/admin/complaints' })));
  res.status(201).json({ success: true, data: { item } });
}));

router.get('/mine', authorize('customer', 'professional'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: { items: await Complaint.find({ raisedBy: req.user._id }).sort({ createdAt: -1 }).limit(50) } });
}));

router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const filter = ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED'].includes(req.query.status) ? { status: req.query.status } : {};
  const items = await Complaint.find(filter).sort({ createdAt: -1 }).limit(100).populate('raisedBy', 'name role').populate('againstUserId', 'name role');
  res.json({ success: true, data: { items } });
}));

router.patch('/:id', authorize('admin'), validate(updateSchema), asyncHandler(async (req, res) => {
  const { status, decision } = req.body;
  const closed = status !== 'UNDER_INVESTIGATION';
  const item = await Complaint.findOneAndUpdate(
    { _id: req.params.id, status: { $in: FROM[status] } },
    { status, isOpen: !closed, ...(decision && { adminDecision: decision }), ...(closed && { resolvedBy: req.user._id, resolvedAt: new Date() }) },
    { new: true }
  );
  if (!item) throw new ApiError(409, 'This complaint cannot move to that status');
  await AuditLog.create({ adminId: req.user._id, action: `complaint_${status.toLowerCase()}`, targetType: 'Complaint', targetId: item._id, reason: decision });
  await notify(item.raisedBy, { type: 'complaint', title: `Your complaint is ${status.replace('_', ' ').toLowerCase()}`, body: decision || 'An admin is looking into it.', link: '/bookings' });
  res.json({ success: true, data: { item } });
}));

export default router;
