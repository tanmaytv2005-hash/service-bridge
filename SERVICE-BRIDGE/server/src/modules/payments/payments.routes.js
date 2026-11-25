import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { razorpay, razorpayEnabled } from '../../config/razorpay.js';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Payment } from './payment.model.js';
import { splitAmount, markPaid } from './payments.service.js';
import { Booking } from '../bookings/booking.model.js';
import { Payout } from '../payouts/payout.model.js';
import { AuditLog } from '../admin/auditLog.model.js';
import { ServiceRequest } from '../serviceRequests/serviceRequest.model.js';
import { ServiceCategory } from '../categories/category.model.js';
import { Referral } from '../referrals/referral.model.js';

const router = Router();
router.use(protect);
const needGateway = () => { if (!razorpayEnabled) throw new ApiError(503, 'Payments are not configured on the server (missing Razorpay test keys)'); };

router.post('/order', authorize('customer'), validate(z.object({ bookingId: z.string().length(24) })), asyncHandler(async (req, res) => {
  needGateway();
  const b = await Booking.findOne({ _id: req.body.bookingId, customerId: req.user._id });
  if (!b) throw new ApiError(404, 'Booking not found');
  if (b.status !== 'COMPLETED') throw new ApiError(409, 'You can pay after the service is completed');
  if (b.paymentStatus !== 'UNPAID') throw new ApiError(409, 'This booking is already paid');

  let pay = await Payment.findOne({ bookingId: b._id, status: 'CREATED' }); // reuse the open order: no duplicate orders
  if (!pay) {
    const request = await ServiceRequest.findById(b.requestId).select('category');
    const category = request && await ServiceCategory.findOne({ slug: request.category }).select('commissionPercent');
    const commissionPercentSnapshot = category?.commissionPercent ?? 15;
    let order;
    try { order = await razorpay.orders.create({ amount: b.amountPaise, currency: 'INR', receipt: `bk_${String(b._id).slice(-12)}`, notes: { bookingId: String(b._id) } }); }
    catch (e) { throw new ApiError(502, `Gateway error: ${e.error?.description || e.message}`); }
    pay = await Payment.create({
      bookingId: b._id, customerId: b.customerId, professionalId: b.professionalId, amountPaise: b.amountPaise,
      commissionPercentSnapshot, ...splitAmount(b.amountPaise, commissionPercentSnapshot), razorpayOrderId: order.id,
    });
  }
  res.json({ success: true, data: { orderId: pay.razorpayOrderId, amount: pay.amountPaise, currency: 'INR', keyId: env.razorpayKeyId } });
}));

// Fast path after checkout: verifies Razorpay's signature on the server. The webhook is the backup/source of truth.
router.post('/verify', authorize('customer'), validate(z.object({
  razorpay_order_id: z.string().min(5), razorpay_payment_id: z.string().min(5), razorpay_signature: z.string().min(10),
})), asyncHandler(async (req, res) => {
  needGateway();
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig } = req.body;
  const pay = await Payment.findOne({ razorpayOrderId: orderId, customerId: req.user._id });
  if (!pay) throw new ApiError(404, 'Payment not found');
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) throw new ApiError(400, 'Invalid payment signature');
  const r = await markPaid({ orderId, paymentId });
  res.json({ success: true, data: { alreadyProcessed: r.alreadyProcessed } });
}));

router.get('/mine', authorize('customer'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: { items: await Payment.find({ customerId: req.user._id }).sort({ createdAt: -1 }).limit(50) } });
}));

router.post('/:id/refund-request', authorize('customer'), validate(z.object({ reason: z.string().trim().min(3).max(300) })), asyncHandler(async (req, res) => {
  const pay = await Payment.findOneAndUpdate(
    { _id: req.params.id, customerId: req.user._id, status: 'PAID', refundStatus: { $in: ['NONE', 'REJECTED'] } },
    { refundStatus: 'REQUESTED', refundReason: req.body.reason }, { new: true });
  if (!pay) throw new ApiError(409, 'A refund cannot be requested for this payment');
  res.json({ success: true, data: { payment: pay } });
}));

// ---- admin ----
router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const items = await Payment.find().sort({ createdAt: -1 }).limit(100);
  const rows = await Payment.aggregate([{ $group: { _id: '$status', n: { $sum: 1 }, gross: { $sum: '$amountPaise' }, commission: { $sum: '$commissionPaise' } } }]);
  const s = Object.fromEntries(rows.map((r) => [r._id, r]));
  const summary = { paidCount: s.PAID?.n || 0, grossPaise: s.PAID?.gross || 0, commissionPaise: s.PAID?.commission || 0, failedCount: s.FAILED?.n || 0, refundedCount: s.REFUNDED?.n || 0 };
  res.json({ success: true, data: { items, summary } });
}));

router.post('/:id/refund/decision', authorize('admin'), validate(z.object({ decision: z.enum(['approve', 'reject']) })), asyncHandler(async (req, res) => {
  const { decision } = req.body;
  if (decision === 'reject') {
    const p = await Payment.findOneAndUpdate({ _id: req.params.id, refundStatus: 'REQUESTED' }, { refundStatus: 'REJECTED' }, { new: true });
    if (!p) throw new ApiError(409, 'No pending refund request');
    await AuditLog.create({ adminId: req.user._id, action: 'refund_reject', targetType: 'Payment', targetId: p._id });
    return res.json({ success: true, data: { payment: p } });
  }
  needGateway();
  const pay = await Payment.findOneAndUpdate({ _id: req.params.id, status: 'PAID', refundStatus: 'REQUESTED' }, { refundStatus: 'PROCESSING' }, { new: true });
  if (!pay) throw new ApiError(409, 'No pending refund request');
  const revert = () => Payment.updateOne({ _id: pay._id }, { refundStatus: 'REQUESTED' });
  const payout = await Payout.findOne({ paymentId: pay._id });
  if (payout?.status === 'PAID') { await revert(); throw new ApiError(409, 'The professional payout is already settled. Recover it manually before refunding.'); }
  try { await razorpay.payments.refund(pay.razorpayPaymentId, { amount: pay.amountPaise, notes: { paymentId: String(pay._id) } }); }
  catch (e) { await revert(); throw new ApiError(502, `Refund failed at gateway: ${e.error?.description || e.message}`); }
  await Payment.updateOne({ _id: pay._id }, { status: 'REFUNDED', refundStatus: 'REFUNDED' });
  await Booking.updateOne({ _id: pay.bookingId }, { paymentStatus: 'REFUNDED' });
  await Payout.updateMany({ paymentId: pay._id, status: 'PENDING' }, { status: 'CANCELLED' });
  const reversedReferral = await Referral.findOneAndUpdate(
    { status: 'REWARDED', qualifyingBookingId: pay.bookingId },
    { $set: { status: 'REVERSED', reversedAt: new Date() } },
    { new: true }
  );
  if (reversedReferral) await AuditLog.create({ adminId: req.user._id, action: 'referral_reward_reversed', targetType: 'Referral', targetId: reversedReferral._id, reason: 'Qualifying booking refunded' });
  await AuditLog.create({ adminId: req.user._id, action: 'refund_approve', targetType: 'Payment', targetId: pay._id });
  res.json({ success: true, message: 'Refund issued' });
}));

export default router;
