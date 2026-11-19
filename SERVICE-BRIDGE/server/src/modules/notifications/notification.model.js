import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, maxlength: 300 },
    link: String,
    readAt: Date,
  },
  { timestamps: true }
);
schema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', schema);
