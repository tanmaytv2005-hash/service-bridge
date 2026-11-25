import { Payment } from './payment.model.js';
import { Professional } from '../professionals/professional.model.js';
import { notify } from '../notifications/notify.js';
import { Payout } from '../payouts/payout.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Referral } from '../referrals/referral.model.js';

// Split the booking amount between the platform and the professional.
export function splitAmount(amountPaise, commissionPercent = 15) {
  const commissionPaise = Math.round((amountPaise * commissionPercent) / 100);

  return {
    professionalSharePaise: amountPaise - commissionPaise,
    commissionPaise,
  };
}

// Safe to call again if the payment webhook retries.
export async function markPaid({ orderId, paymentId }) {
  const pay = await Payment.findOneAndUpdate(
    {
      razorpayOrderId: orderId,
      status: { $in: ['CREATED', 'FAILED'] },
    },
    {
      status: 'PAID',
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
      $unset: { failureReason: 1 },
    },
    { new: true }
  );

  if (!pay) {
    return { alreadyProcessed: true };
  }

  await Booking.updateOne(
    { _id: pay.bookingId },
    { paymentStatus: 'PAID' }
  );

  const professional = await Professional
    .findById(pay.professionalId)
    .select('userId');

  if (professional) {
    await notify(professional.userId, {
      type: 'payment',
      title: 'Payment received',
      body: `A customer paid for a completed job. Your share: ₹${pay.professionalSharePaise / 100}.`,
      link: '/professional/earnings',
    });
  }

  try {
    await Payout.create({
      paymentId: pay._id,
      bookingId: pay.bookingId,
      professionalId: pay.professionalId,
      grossPaise: pay.amountPaise,
      commissionPaise: pay.commissionPaise,
      amountPaise: pay.professionalSharePaise,
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }

  const referral = await Referral.findOneAndUpdate(
    {
      referredUserId: pay.customerId,
      status: 'PENDING',
    },
    {
      $set: {
        status: 'REWARDED',
        qualifyingBookingId: pay.bookingId,
        rewardedAt: new Date(),
      },
    },
    { new: true }
  );

  if (referral) {
    await notify(referral.referrerUserId, {
      type: 'referral',
      title: 'Referral reward earned',
      body: `Your friend completed their first paid booking. You earned ₹${referral.rewardPaise / 100} in demo credit.`,
      link: '/customer/referrals',
    });
  }

  return {
    alreadyProcessed: false,
    payment: pay,
  };
}