import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { haversineKm } from '../../utils/geo.js';
import { ServiceRequest } from './serviceRequest.model.js';
import { ServiceCategory } from '../categories/category.model.js';
import { Professional } from '../professionals/professional.model.js';
import { Quotation } from '../quotations/quotation.model.js';

const today = () => new Date().toISOString().slice(0, 10);
const createSchema = z.object({
  category: z.string().trim().min(1),
  description: z.string().trim().min(10, 'Describe the problem in at least 10 characters').max(1000),
  address: z.string().trim().min(5).max(300),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => d >= today(), 'Date cannot be in the past'),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
  urgency: z.enum(['normal', 'urgent', 'emergency']).default('normal'),
  instructions: z.string().trim().max(500).optional(),
});

const router = Router();
router.use(protect);

router.post('/', authorize('customer'), validate(createSchema), asyncHandler(async (req, res) => {
  const { lat, lng, ...rest } = req.body;
  if (!(await ServiceCategory.exists({ slug: rest.category, isActive: true }))) throw new ApiError(400, 'Invalid category');
  const item = await ServiceRequest.create({ ...rest, customerId: req.user._id, location: { type: 'Point', coordinates: [lng, lat] } });
  res.status(201).json({ success: true, data: { item } });
}));

router.get('/mine', authorize('customer'), asyncHandler(async (req, res) => {
  const items = await ServiceRequest.find({ customerId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const counts = await Quotation.aggregate([{ $match: { requestId: { $in: items.map((i) => i._id) } } }, { $group: { _id: '$requestId', n: { $sum: 1 } } }]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({ success: true, data: { items: items.map((i) => ({ ...i.toObject(), quotationCount: map[String(i._id)] || 0 })) } });
}));

router.get('/eligible', authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  if (!pro || pro.status !== 'approved') throw new ApiError(403, 'Only approved professionals can view requests');
  if (!pro.location) throw new ApiError(400, 'Set your service location first');
  const origin = pro.location.coordinates;
  const reqs = await ServiceRequest.find({
    status: 'open', category: { $in: pro.categories },
    location: { $nearSphere: { $geometry: { type: 'Point', coordinates: origin }, $maxDistance: 25000 } },
  }).limit(30);
  const mine = await Quotation.find({ professionalId: pro._id, requestId: { $in: reqs.map((r) => r._id) } });
  const byReq = Object.fromEntries(mine.map((q) => [String(q.requestId), q]));
  // Customer address and exact coordinates are NOT shared until a booking is confirmed
  const items = reqs.map((r) => ({
    id: r._id, category: r.category, description: r.description, preferredDate: r.preferredDate, preferredTime: r.preferredTime,
    urgency: r.urgency, distanceKm: haversineKm(origin, r.location.coordinates), myQuotation: byReq[String(r._id)] || null,
  }));
  res.json({ success: true, data: { items } });
}));

router.get('/:id', authorize('customer'), asyncHandler(async (req, res) => {
  const item = await ServiceRequest.findOne({ _id: req.params.id, customerId: req.user._id });
  if (!item) throw new ApiError(404, 'Request not found');
  const quotes = await Quotation.find({ requestId: item._id }).sort({ price: 1 })
    .populate({ path: 'professionalId', select: 'experienceYears availability ratingAvg ratingCount userId', populate: { path: 'userId', select: 'name' } });
  const quotations = quotes.map((q) => ({
    id: q._id, price: q.price, etaMinutes: q.etaMinutes, message: q.message, status: q.status,
    professional: { name: q.professionalId?.userId?.name, experienceYears: q.professionalId?.experienceYears, availability: q.professionalId?.availability, ratingAvg: q.professionalId?.ratingAvg || 0, ratingCount: q.professionalId?.ratingCount || 0 },
  }));
  res.json({ success: true, data: { item, quotations } });
}));

router.post('/:id/cancel', authorize('customer'), asyncHandler(async (req, res) => {
  const item = await ServiceRequest.findOneAndUpdate({ _id: req.params.id, customerId: req.user._id, status: 'open' }, { status: 'cancelled' }, { new: true });
  if (!item) throw new ApiError(409, 'Only open requests can be cancelled');
  await Quotation.updateMany({ requestId: item._id, status: 'submitted' }, { status: 'rejected' });
  res.json({ success: true, data: { item } });
}));

export default router;
