import { Payment } from './payment.model.js';
import { Professional } from '../professionals/professional.model.js';
import { notify } from '../notifications/notify.js';
import { Payout } from '../payouts/payout.model.js';
import { Booking } from '../bookings/booking.model.js';

// The category rate is snapshotted on the Payment when checkout starts. Integer paise always balance.
export function splitAmount(amountPaise, commissionPercent = 15) {
  const commissionPaise = Math.round((amountPaise * commissionPercent) / 100);
  return { professionalSharePaise: amountPaise - commissionPaise, commissionPaise };
}

// Safe to call many times (checkout verify, webhook retries): only the first call changes anything.
export async function markPaid({ orderId, paymentId }) {
  const pay = await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId, status: { $in: ['CREATED', 'FAILED'] } },
    { status: 'PAID', razorpayPaymentId: paymentId, paidAt: new Date(), $unset: { failureReason: 1 } },
    { new: true }
  );
  if (!pay) return { alreadyProcessed: true };
  await Booking.updateOne({ _id: pay.bookingId }, { paymentStatus: 'PAID' });
  const proDoc = await Professional.findById(pay.professionalId).select('userId');
  if (proDoc) await notify(proDoc.userId, { type: 'payment', title: 'Payment received', body: `A customer paid for a completed job. Your share: ₹${pay.professionalSharePaise / 100}.`, link: '/professional/earnings' });
  try {
    await Payout.create({
      paymentId: pay._id, bookingId: pay.bookingId, professionalId: pay.professionalId,
      grossPaise: pay.amountPaise, commissionPaise: pay.commissionPaise, amountPaise: pay.professionalSharePaise,
    });
  } catch (e) { if (e.code !== 11000) throw e; } // payout already exists: no double commission
  return { alreadyProcessed: false, payment: pay };
}
