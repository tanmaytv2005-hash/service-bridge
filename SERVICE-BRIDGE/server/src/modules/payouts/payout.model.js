import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true }, // one payout per payment
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true, index: true },
    grossPaise: { type: Number, required: true },
    commissionPaise: { type: Number, required: true },
    amountPaise: { type: Number, required: true }, // net amount owed to the professional
    status: { type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING', index: true },
    reference: { type: String, maxlength: 80 },
    paidAt: Date,
  },
  { timestamps: true }
);

export const Payout = mongoose.model('Payout', schema);
