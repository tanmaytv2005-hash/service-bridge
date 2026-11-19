import mongoose from 'mongoose';

const point = new mongoose.Schema(
  { type: { type: String, enum: ['Point'], required: true }, coordinates: { type: [Number], required: true } },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true }, // ServiceCategory slug
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    location: { type: point, required: true },
    preferredDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    preferredTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    urgency: { type: String, enum: ['normal', 'urgent', 'emergency'], default: 'normal' },
    instructions: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['open', 'booked', 'cancelled'], default: 'open', index: true },
  },
  { timestamps: true }
);
schema.index({ location: '2dsphere' });

export const ServiceRequest = mongoose.model('ServiceRequest', schema);
