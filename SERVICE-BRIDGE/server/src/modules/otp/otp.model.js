import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    type: {
      type: String,
      enum: ['ARRIVAL', 'COMPLETION'],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    usedAt: Date,
    invalidatedAt: Date,
  },
  { timestamps: true }
);

schema.index({ bookingId: 1, type: 1, createdAt: -1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export const OTPVerification = mongoose.model('OTPVerification', schema);