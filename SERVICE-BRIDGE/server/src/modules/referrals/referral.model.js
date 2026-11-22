import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['PENDING', 'REWARDED', 'REVERSED'], default: 'PENDING', index: true },
  rewardPaise: { type: Number, required: true, default: 10000, min: 0 },
  qualifyingBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  rewardedAt: { type: Date, default: null },
  reversedAt: { type: Date, default: null },
}, { timestamps: true });

referralSchema.index({ referrerUserId: 1, createdAt: -1 });

export const Referral = mongoose.model('Referral', referralSchema);
