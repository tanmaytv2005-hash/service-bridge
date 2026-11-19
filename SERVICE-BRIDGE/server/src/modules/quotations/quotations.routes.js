import { Router } from 'express';
import { notify } from '../notifications/notify.js';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Quotation } from './quotation.model.js';
import { ServiceRequest } from '../serviceRequests/serviceRequest.model.js';
import { Professional } from '../professionals/professional.model.js';

const createSchema = z.object({
  requestId: z.string().length(24),
  price: z.coerce.number().int('Whole rupees only').min(1).max(1000000),
  etaMinutes: z.coerce.number().int().min(0).max(10080).optional(),
  message: z.string().trim().max(300).optional(),
});

const router = Router();
router.use(protect, authorize('professional'));

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ userId: req.user._id });
  if (!pro || pro.status !== 'approved') throw new ApiError(403, 'Only approved professionals can send quotations');
  if (!pro.location) throw new ApiError(400, 'Set your service location first');
  const eligible = await ServiceRequest.exists({
    _id: req.body.requestId, status: 'open', category: { $in: pro.categories },
    location: { $nearSphere: { $geometry: { type: 'Point', coordinates: pro.location.coordinates }, $maxDistance: 25000 } },
  });
  if (!eligible) throw new ApiError(404, 'This request is not available to you');
  if (await Quotation.exists({ requestId: req.body.requestId, professionalId: pro._id })) throw new ApiError(409, 'You already sent a quotation for this request');
  const item = await Quotation.create({ ...req.body, professionalId: pro._id });
  const rq = await ServiceRequest.findById(req.body.requestId).select('customerId category');
  if (rq) await notify(rq.customerId, { type: 'quotation', title: 'New quotation received', body: `A professional quoted ₹${item.price} for your ${rq.category} request.`, link: `/customer/requests/${rq._id}` });
  res.status(201).json({ success: true, data: { item } });
}));

export default router;
