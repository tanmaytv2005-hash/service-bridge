import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { User } from '../users/user.model.js';
import { Professional } from '../professionals/professional.model.js';
import { Booking } from '../bookings/booking.model.js';
import { ServiceRequest } from '../serviceRequests/serviceRequest.model.js';
import { Payment } from '../payments/payment.model.js';
import { Complaint } from '../complaints/complaint.model.js';
import { Review } from '../reviews/review.model.js';

const router = Router();
router.use(protect, authorize('admin'));
const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));

router.get('/', asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [customers, pros, bookings, requests, pay, complaints, rating, daily, cats] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Professional.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ServiceRequest.countDocuments(),
    Payment.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, n: { $sum: 1 }, gross: { $sum: '$amountPaise' }, commission: { $sum: '$commissionPaise' } } }]),
    Complaint.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ServiceRequest.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 }]),
  ]);
  res.json({ success: true, data: {
    customers, requests, professionals: toMap(pros), bookings: toMap(bookings), complaints: toMap(complaints),
    revenue: { paidCount: pay[0]?.n || 0, grossPaise: pay[0]?.gross || 0, commissionPaise: pay[0]?.commission || 0 },
    rating: { avg: rating[0] ? Math.round(rating[0].avg * 10) / 10 : 0, count: rating[0]?.n || 0 },
    daily: daily.map((d) => ({ date: d._id, n: d.n })), topCategories: cats.map((c) => ({ category: c._id, n: c.n })),
  } });
}));

export default router;
