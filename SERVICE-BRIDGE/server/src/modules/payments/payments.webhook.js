import crypto from 'crypto';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Payment, WebhookEvent } from './payment.model.js';
import { markPaid } from './payments.service.js';

const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Mounted with express.raw(): the signature must be checked against the exact raw bytes
export const webhook = asyncHandler(async (req, res) => {
  if (!env.razorpayWebhookSecret) return res.status(503).json({ success: false, message: 'Webhook not configured' });
  const signature = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(req.body).digest('hex');
  if (!signature || !safeEqual(expected, signature)) return res.status(400).json({ success: false, message: 'Invalid signature' });

  const eventId = String(req.headers['x-razorpay-event-id'] || '');
  if (eventId && (await WebhookEvent.exists({ eventId }))) return res.json({ received: true, duplicate: true });

  const body = JSON.parse(req.body.toString('utf8'));
  const ent = body.payload?.payment?.entity;
  if (ent && ['payment.captured', 'order.paid'].includes(body.event)) {
    const pay = await Payment.findOne({ razorpayOrderId: ent.order_id });
    if (pay && pay.amountPaise === ent.amount && ent.currency === 'INR') await markPaid({ orderId: ent.order_id, paymentId: ent.id });
    else console.warn('Webhook ignored: unknown order or amount mismatch', ent.order_id);
  } else if (ent && body.event === 'payment.failed') {
    await Payment.updateOne({ razorpayOrderId: ent.order_id, status: 'CREATED' }, { status: 'FAILED', failureReason: ent.error_description });
  }
  if (eventId) await WebhookEvent.create({ eventId, type: body.event }).catch((e) => { if (e.code !== 11000) throw e; });
  res.json({ received: true });
});
