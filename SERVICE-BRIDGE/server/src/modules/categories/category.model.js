import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    commissionPercent: { type: Number, min: 0, max: 50, default: 15 },
  },
  { timestamps: true }
);

export const ServiceCategory = mongoose.model('ServiceCategory', categorySchema);
