import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 2048 },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true, maxlength: 200 },
      auth: { type: String, required: true, maxlength: 200 },
    },
  },
  { timestamps: true }
);

schema.index({ userId: 1, createdAt: -1 });

export const PushSubscription = mongoose.model('PushSubscription', schema);
