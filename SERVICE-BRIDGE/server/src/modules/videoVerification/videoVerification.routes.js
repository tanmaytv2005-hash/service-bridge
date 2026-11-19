import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { VideoVerification } from './videoVerification.model.js';
import { Professional } from '../professionals/professional.model.js';
import { User } from '../users/user.model.js';
import { AuditLog } from '../admin/auditLog.model.js';
import { notify } from '../notifications/notify.js';

const router = Router();
router.use(protect);

router.post('/request', authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  if (!pro || pro.status !== 'under_review') throw new ApiError(409, 'Submit your profile for review first');
  if (await VideoVerification.exists({ professionalId: pro._id, status: { $in: ['REQUESTED', 'LIVE'] } })) throw new ApiError(409, 'You already have an open video verification');
  const session = await VideoVerification.create({ professionalId: pro._id });
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  await Promise.all(admins.map((a) => notify(a._id, { type: 'video', title: 'Video verification requested', body: `${req.user.name} is waiting for a video check.`, link: '/admin/video' })));
  res.status(201).json({ success: true, data: { session } });
}));

router.get('/mine', authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  const session = pro ? await VideoVerification.findOne({ professionalId: pro._id }).sort({ createdAt: -1 }) : null;
  res.json({ success: true, data: { session } });
}));

router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const items = await VideoVerification.find().sort({ createdAt: -1 }).limit(50)
    .populate({ path: 'professionalId', select: 'userId categories', populate: { path: 'userId', select: 'name' } });
  res.json({ success: true, data: { items } });
}));

router.post('/:id/start', authorize('admin'), asyncHandler(async (req, res) => {
  const s = await VideoVerification.findOneAndUpdate({ _id: req.params.id, status: 'REQUESTED' }, { status: 'LIVE', adminId: req.user._id, startedAt: new Date() }, { new: true });
  if (!s) throw new ApiError(409, 'This request is not waiting');
  const pro = await Professional.findById(s.professionalId).select('userId');
  if (pro) await notify(pro.userId, { type: 'video', title: 'Your video verification is live', body: 'Open your dashboard and join the call now.', link: '/professional' });
  res.json({ success: true, data: { session: s } });
}));

router.post('/:id/result', authorize('admin'), validate(z.object({ result: z.enum(['PASSED', 'FAILED']), notes: z.string().trim().max(500).optional() })), asyncHandler(async (req, res) => {
  const s = await VideoVerification.findOneAndUpdate({ _id: req.params.id, status: 'LIVE', adminId: req.user._id }, { status: 'COMPLETED', result: req.body.result, notes: req.body.notes, endedAt: new Date() }, { new: true });
  if (!s) throw new ApiError(409, 'Only your live session can be completed');
  await AuditLog.create({ adminId: req.user._id, action: `video_${req.body.result.toLowerCase()}`, targetType: 'VideoVerification', targetId: s._id, reason: req.body.notes });
  const pro = await Professional.findById(s.professionalId).select('userId');
  if (pro) await notify(pro.userId, { type: 'video', title: 'Video verification finished', body: req.body.result === 'PASSED' ? 'You passed. An admin will complete your approval.' : 'The check did not pass. See your dashboard.', link: '/professional' });
  res.json({ success: true, data: { session: s } });
}));

export default router;
