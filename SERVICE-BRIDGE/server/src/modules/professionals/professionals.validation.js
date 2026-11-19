import { z } from 'zod';

export const profileSchema = z.object({
  bio: z.string().trim().max(500).optional(),
  categories: z.array(z.string().trim().min(1)).min(1, 'Choose at least one category').max(5),
  skills: z.array(z.string().trim().min(1)).max(15).default([]),
  experienceYears: z.coerce.number().min(0).max(60),
  serviceAreas: z.array(z.string().trim().min(1)).max(10).default([]),
  city: z.string().trim().min(2).max(60),
});

export const documentSchema = z.object({
  docType: z.enum(['identity', 'address', 'skill_certificate']),
  documentRef: z.string().trim().min(4, 'Enter a demo reference of 4+ characters').max(30),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
});

export const aadhaarSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Enter a 12-digit Aadhaar number'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
});

export const livePhotoSchema = z.object({
  photoData: z.string().max(550000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/, 'Capture a JPEG photo using the camera'),
});
