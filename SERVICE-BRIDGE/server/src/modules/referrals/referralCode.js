import crypto from 'node:crypto';
import { User } from '../users/user.model.js';

export const REFERRAL_REWARD_PAISE = 10000;

export function createReferralCode() {
  return `SB${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

export async function ensureReferralCode(userId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await User.findById(userId).select('referralCode');
    if (!current) return null;
    if (current.referralCode) return current;
    try {
      const updated = await User.findOneAndUpdate(
        { _id: userId, $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' }] },
        { $set: { referralCode: createReferralCode() } },
        { new: true, runValidators: true }
      ).select('referralCode');
      if (updated) return updated;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  throw new Error('Could not create a unique referral code');
}
