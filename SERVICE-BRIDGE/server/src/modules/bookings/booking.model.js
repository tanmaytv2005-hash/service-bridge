import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 100 }, // integer paise, used by payments later
    slotKey: { type: String, required: true }, // "YYYY-MM-DDTHH:MM"
    status: { type: String, enum: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED'], default: 'CONFIRMED', index: true },
    paymentStatus: { type: String, enum: ['UNPAID', 'PAID', 'REFUNDED'], default: 'UNPAID' },
    isActive: { type: Boolean, default: true }, // true while the booking occupies the professional's time slot,
    cancelReason: { type: String, maxlength: 300 },
    history: [{ _id: false, status: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
// Database-level guard: a professional cannot hold two confirmed bookings in the same slot
schema.index({ professionalId: 1, slotKey: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export const Booking = mongoose.model('Booking', schema);
