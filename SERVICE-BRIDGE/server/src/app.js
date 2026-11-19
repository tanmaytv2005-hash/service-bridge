import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';
import professionalRoutes from './modules/professionals/professionals.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import locationRoutes from './modules/locations/locations.routes.js';
import serviceRequestRoutes from './modules/serviceRequests/serviceRequests.routes.js';
import quotationRoutes from './modules/quotations/quotations.routes.js';
import bookingRoutes from './modules/bookings/bookings.routes.js';
import otpRoutes from './modules/otp/otp.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import payoutRoutes from './modules/payouts/payouts.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import videoRoutes from './modules/videoVerification/videoVerification.routes.js';
import reviewRoutes from './modules/reviews/reviews.routes.js';
import complaintRoutes from './modules/complaints/complaints.routes.js';
import analyticsRoutes from './modules/admin/analytics.routes.js';
import { webhook } from './modules/payments/payments.webhook.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
// Razorpay webhook needs the raw body for signature checking, so it is mounted before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '100kb' }), webhook);
app.use(express.json({ limit: '700kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/admin/analytics', analyticsRoutes); // before the generic admin router
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/video-verification', videoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
