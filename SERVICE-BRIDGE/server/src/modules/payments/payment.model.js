import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
    amountPaise: { type: Number, required: true, min: 100 },
    commissionPercentSnapshot: { type: Number, min: 0, max: 50, default: 15 },
    commissionPaise: { type: Number, required: true },
    professionalSharePaise: { type: Number, required: true },
    status: { type: String, enum: ['CREATED', 'PAID', 'FAILED', 'REFUNDED'], default: 'CREATED', index: true },
    refundStatus: { type: String, enum: ['NONE', 'REQUESTED', 'PROCESSING', 'REFUNDED', 'REJECTED'], default: 'NONE' },
    refundReason: { type: String, maxlength: 300 },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    paidAt: Date,
    failureReason: String,
  },
  { timestamps: true }
);
// A booking can only ever have one PAID payment (duplicate-payment guard at database level)
schema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { status: 'PAID' } });
schema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } });

export const Payment = mongoose.model('Payment', schema);

const eventSchema = new mongoose.Schema({ eventId: { type: String, required: true, unique: true }, type: String, createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 } });
export const WebhookEvent = mongoose.model('WebhookEvent', eventSchema);
