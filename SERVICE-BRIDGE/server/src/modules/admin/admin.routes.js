import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { listProfessionals, getProfessional, decide } from './admin.controller.js';
import { addProfessional, removeProfessional, reviewAadhaar } from './admin.controller.js';

const decisionSchema = z
  .object({ decision: z.enum(['approve', 'reject', 'suspend']), reason: z.string().trim().max(300).optional() })
  .refine((d) => d.decision === 'approve' || !!d.reason, { message: 'A reason is required', path: ['reason'] });

const router = Router();
router.use(protect, authorize('admin'));
router.post('/professionals', addProfessional);
router.get('/professionals', listProfessionals);
router.get('/professionals/:id', getProfessional);
router.patch('/professionals/:id/aadhaar', reviewAadhaar);
router.patch('/professionals/:id/decision', validate(decisionSchema), decide);
router.delete('/professionals/:id', removeProfessional);
export default router;
