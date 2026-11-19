import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    raisedByRole: { type: String, enum: ['customer', 'professional'], required: true },
    againstUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['service_quality', 'no_show', 'payment', 'behaviour', 'other'], required: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    status: { type: String, enum: ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED'], default: 'OPEN', index: true },
    isOpen: { type: Boolean, default: true },
    adminDecision: { type: String, maxlength: 500 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true }
);
// One unresolved complaint per person per booking
schema.index({ bookingId: 1, raisedBy: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });

export const Complaint = mongoose.model('Complaint', schema);
