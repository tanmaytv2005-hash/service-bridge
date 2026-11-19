import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { profileSchema, documentSchema, aadhaarSchema, livePhotoSchema } from './professionals.validation.js';
import { getMe, saveProfile, addDocument, submit, setLocation, setAvailability, saveAadhaar, saveLivePhoto } from './professionals.controller.js';

const locationSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });
const availabilitySchema = z.object({ availability: z.enum(['available', 'busy', 'offline']) });

const router = Router();
router.use(protect, authorize('professional'));
router.get('/me', getMe);
router.put('/aadhaar', validate(aadhaarSchema), saveAadhaar);
router.put('/live-photo', validate(livePhotoSchema), saveLivePhoto);
router.put('/profile', validate(profileSchema), saveProfile);
router.post('/documents', validate(documentSchema), addDocument);
router.post('/submit', submit);
router.put('/location', validate(locationSchema), setLocation);
router.put('/availability', validate(availabilitySchema), setAvailability);
export default router;
