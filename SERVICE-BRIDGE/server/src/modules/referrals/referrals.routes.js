import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../users/user.model.js';
import { Referral } from './referral.model.js';
import { ensureReferralCode, REFERRAL_REWARD_PAISE } from './referralCode.js';

const router = Router();
router.use(protect, authorize('customer'));

router.get('/mine', asyncHandler(async (req, res) => {
  const account = await ensureReferralCode(req.user._id);
  if (!account) throw new ApiError(404, 'Customer account not found');

  const referrals = await Referral.find({ referrerUserId: req.user._id })
    .sort({ createdAt: -1 })
    .select('status rewardPaise createdAt rewardedAt reversedAt');
  const summary = referrals.reduce((result, item) => {
    result.total += 1;
    if (item.status === 'PENDING') result.pending += 1;
    if (item.status === 'REWARDED') {
      result.rewarded += 1;
      result.demoCreditPaise += item.rewardPaise;
    }
    if (item.status === 'REVERSED') result.reversed += 1;
    return result;
  }, { total: 0, pending: 0, rewarded: 0, reversed: 0, demoCreditPaise: 0 });

  res.json({
    success: true,
    data: {
      referralCode: account.referralCode,
      rewardPaise: REFERRAL_REWARD_PAISE,
      summary,
      items: referrals,
    },
  });
}));

export default router;
