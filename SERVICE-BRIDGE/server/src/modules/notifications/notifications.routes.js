import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Notification } from './notification.model.js';
import { PushSubscription } from './pushSubscription.model.js';
import { env } from '../../config/env.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.use(protect);

const keySchema = z.string().min(8).max(200).regex(/^[A-Za-z0-9_-]+$/);
const allowedPushHost = (value) => {
  try {
    const { protocol, hostname } = new URL(value);
    const host = hostname.toLowerCase();
    return protocol === 'https:' && (
      host.endsWith('.googleapis.com')
      || host === 'push.services.mozilla.com'
      || host.endsWith('.push.services.mozilla.com')
      || host.endsWith('.push.apple.com')
      || host.endsWith('.notify.windows.com')
    );
  } catch {
    return false;
  }
};
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine(allowedPushHost, 'Unsupported push-service endpoint'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: keySchema, auth: keySchema }).strict(),
}).strict();

router.get('/push/config', (req, res) => {
  const configured = Boolean(env.vapidPublicKey && env.vapidPrivateKey);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { configured, publicKey: configured ? env.vapidPublicKey : null } });
});

router.post('/push/subscription', validate(subscriptionSchema), asyncHandler(async (req, res) => {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    return res.status(503).json({ success: false, message: 'Phone notifications are not configured on the server yet.' });
  }
  const { endpoint, expirationTime, keys } = req.body;
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { $set: { userId: req.user._id, endpoint, expirationTime: expirationTime ?? null, keys } },
    { upsert: true, new: true, runValidators: true }
  );
  res.status(201).json({ success: true, message: 'Phone notifications enabled on this device.' });
}));

router.delete('/push/subscription', validate(z.object({ endpoint: z.string().url().max(2048) })), asyncHandler(async (req, res) => {
  await PushSubscription.deleteOne({ userId: req.user._id, endpoint: req.body.endpoint });
  res.json({ success: true, message: 'Phone notifications disabled on this device.' });
}));

router.get('/', asyncHandler(async (req, res) => {
  const items = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, readAt: null });
  res.json({ success: true, data: { items, unreadCount } });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ success: true });
}));

export default router;
