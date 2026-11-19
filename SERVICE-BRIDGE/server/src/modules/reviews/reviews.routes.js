import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Review } from './review.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Professional } from '../professionals/professional.model.js';
import { notify } from '../notifications/notify.js';

const createSchema = z.object({
  bookingId: z.string().length(24),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
const firstName = (n = '') => n.split(' ')[0]; // reviewers are shown by first name only

const router = Router();
router.use(protect);

router.post('/', authorize('customer'), validate(createSchema), asyncHandler(async (req, res) => {
  const b = await Booking.findOne({ _id: req.body.bookingId, customerId: req.user._id });
  if (!b) throw new ApiError(404, 'Booking not found');
  if (b.status !== 'COMPLETED') throw new ApiError(409, 'You can review a booking after it is completed');
  let review;
  try { review = await Review.create({ ...req.body, customerId: req.user._id, professionalId: b.professionalId }); }
  catch (e) { if (e.code === 11000) throw new ApiError(409, 'You already reviewed this booking'); throw e; }

  const [agg] = await Review.aggregate([{ $match: { professionalId: b.professionalId } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  const pro = await Professional.findByIdAndUpdate(b.professionalId, { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.n });
  if (pro) await notify(pro.userId, { type: 'review', title: 'New review', body: `You received ${review.rating} star(s).`, link: '/professional/reviews' });
  res.status(201).json({ success: true, data: { review } });
}));

router.get('/mine', authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  if (!pro) return res.json({ success: true, data: { items: [], ratingAvg: 0, ratingCount: 0 } });
  const rows = await Review.find({ professionalId: pro._id }).sort({ createdAt: -1 }).limit(50).populate('customerId', 'name');
  res.json({ success: true, data: { ratingAvg: pro.ratingAvg || 0, ratingCount: pro.ratingCount || 0, items: rows.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, customer: firstName(r.customerId?.name), createdAt: r.createdAt })) } });
}));

router.get('/professional/:id', authorize('customer', 'admin'), asyncHandler(async (req, res) => {
  const rows = await Review.find({ professionalId: req.params.id }).sort({ createdAt: -1 }).limit(20).populate('customerId', 'name');
  res.json({ success: true, data: { items: rows.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, customer: firstName(r.customerId?.name), createdAt: r.createdAt })) } });
}));

export default router;
