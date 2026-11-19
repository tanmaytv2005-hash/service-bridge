import { Router } from 'express';
import { Review } from '../reviews/review.model.js';
import { Complaint } from '../complaints/complaint.model.js';
import { notify } from '../notifications/notify.js';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Booking } from './booking.model.js';
import { Quotation } from '../quotations/quotation.model.js';
import { ServiceRequest } from '../serviceRequests/serviceRequest.model.js';
import { Professional } from '../professionals/professional.model.js';

const router = Router();
router.use(protect);

router.post('/', authorize('customer'), validate(z.object({ quotationId: z.string().length(24) })), asyncHandler(async (req, res) => {
  const q = await Quotation.findById(req.body.quotationId);
  const reqDoc = q && (await ServiceRequest.findOne({ _id: q.requestId, customerId: req.user._id }));
  if (!q || !reqDoc) throw new ApiError(404, 'Quotation not found');
  if (q.status !== 'submitted') throw new ApiError(409, 'This quotation is no longer available');
  const pro = await Professional.findById(q.professionalId);
  if (!pro || pro.status !== 'approved') throw new ApiError(409, 'This professional is not available');

  // 1) Atomically claim the request: only one quotation can ever be accepted
  const claimed = await ServiceRequest.findOneAndUpdate({ _id: reqDoc._id, status: 'open' }, { status: 'booked' });
  if (!claimed) throw new ApiError(409, 'This request already has a booking');

  let booking;
  try {
    booking = await Booking.create({
      requestId: reqDoc._id, quotationId: q._id, customerId: req.user._id, professionalId: pro._id,
      amountPaise: q.price * 100, slotKey: `${reqDoc.preferredDate}T${reqDoc.preferredTime}`,
      history: [{ status: 'CONFIRMED', by: req.user._id }],
    });
  } catch (err) {
    await ServiceRequest.updateOne({ _id: reqDoc._id }, { status: 'open' }); // undo the claim
    if (err.code === 11000) throw new ApiError(409, 'This professional already has a booking at that time. Choose another quotation.');
    throw err;
  }
  await Quotation.updateOne({ _id: q._id }, { status: 'accepted' });
  await Quotation.updateMany({ requestId: reqDoc._id, _id: { $ne: q._id }, status: 'submitted' }, { status: 'rejected' });
  await notify(pro.userId, { type: 'booking', title: 'New booking confirmed', body: `You have a new booking for ₹${booking.amountPaise / 100}.`, link: '/bookings' });
  res.status(201).json({ success: true, data: { booking } });
}));

router.get('/mine', authorize('customer', 'professional'), asyncHandler(async (req, res) => {
  let filter = { customerId: req.user._id };
  if (req.user.role === 'professional') {
    const pro = await Professional.findOne({ userId: req.user._id });
    filter = { professionalId: pro?._id };
  }
  const items = await Booking.find(filter).sort({ createdAt: -1 }).limit(50)
    .populate('requestId', 'category description address preferredDate preferredTime urgency instructions')
    .populate('customerId', 'name')
    .populate({ path: 'professionalId', select: 'experienceYears userId', populate: { path: 'userId', select: 'name' } });
  const ids = items.map((i) => i._id);
  const [revs, comps] = await Promise.all([
    Review.find({ bookingId: { $in: ids } }).select('bookingId'),
    Complaint.find({ bookingId: { $in: ids }, raisedBy: req.user._id }).sort({ createdAt: 1 }).select('bookingId status'),
  ]);
  const reviewed = new Set(revs.map((r) => String(r.bookingId)));
  const complaintBy = Object.fromEntries(comps.map((c) => [String(c.bookingId), c.status]));
  res.json({ success: true, data: { items: items.map((i) => ({ ...i.toObject(), reviewed: reviewed.has(String(i._id)), complaintStatus: complaintBy[String(i._id)] || null })) } });
}));

// A customer may view the assigned professional's photo only for their own active booking.
router.get('/:id/professional-photo', authorize('customer'), asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    customerId: req.user._id,
    status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING'] },
  }).select('professionalId');
  if (!booking) throw new ApiError(404, 'Active booking not found');
  const professional = await Professional.findById(booking.professionalId).select('+livePhotoData');
  if (!professional?.livePhotoData) throw new ApiError(404, 'This professional has not added a camera photo yet');
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, data: { photoData: professional.livePhotoData } });
}));

router.post('/:id/cancel', authorize('customer', 'professional'), validate(z.object({ reason: z.string().trim().max(300).optional() })), asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b) throw new ApiError(404, 'Booking not found');
  let allowed = String(b.customerId) === String(req.user._id);
  if (!allowed && req.user.role === 'professional') {
    const pro = await Professional.findOne({ userId: req.user._id });
    allowed = !!pro && String(pro._id) === String(b.professionalId);
  }
  if (!allowed) throw new ApiError(404, 'Booking not found'); // do not reveal other users' bookings
  const updated = await Booking.findOneAndUpdate(
    { _id: b._id, status: 'CONFIRMED' },
    { status: 'CANCELLED', isActive: false, cancelReason: req.body.reason, $push: { history: { status: 'CANCELLED', by: req.user._id } } },
    { new: true }
  );
  if (!updated) throw new ApiError(409, 'Only confirmed bookings can be cancelled');
  const otherUser = String(req.user._id) === String(updated.customerId) ? (await Professional.findById(updated.professionalId))?.userId : updated.customerId;
  if (otherUser) await notify(otherUser, { type: 'booking', title: 'Booking cancelled', body: 'A confirmed booking was cancelled.', link: '/bookings' });
  res.json({ success: true, data: { booking: updated } });
}));

router.post('/:id/ready', authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  const booking = pro && (await Booking.findOneAndUpdate(
    { _id: req.params.id, professionalId: pro._id, status: 'IN_PROGRESS' },
    { status: 'COMPLETION_PENDING', $push: { history: { status: 'COMPLETION_PENDING', by: req.user._id } } },
    { new: true }
  ));
  if (!booking) throw new ApiError(409, 'Only a booking in progress can be marked ready for completion');
  await notify(booking.customerId, { type: 'booking', title: 'Work finished', body: 'Confirm the work and get the completion OTP.', link: '/bookings' });
  res.json({ success: true, data: { booking } });
}));

export default router;
