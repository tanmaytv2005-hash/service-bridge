import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true, index: true },
    price: { type: Number, required: true, min: 1, max: 1000000, validate: Number.isInteger }, // rupees
    etaMinutes: { type: Number, min: 0, max: 10080 },
    message: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['submitted', 'accepted', 'rejected'], default: 'submitted' },
  },
  { timestamps: true }
);
schema.index({ requestId: 1, professionalId: 1 }, { unique: true }); // one quotation per professional per request

export const Quotation = mongoose.model('Quotation', schema);
