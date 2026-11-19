import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Notification } from './notification.model.js';

const router = Router();
router.use(protect);

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
