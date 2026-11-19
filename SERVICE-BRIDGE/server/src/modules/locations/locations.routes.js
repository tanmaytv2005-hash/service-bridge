import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Professional } from '../professionals/professional.model.js';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(50).default(10),
  category: z.string().trim().max(60).optional(),
  minExperience: z.coerce.number().min(0).max(60).default(0),
  minRating: z.coerce.number().min(0).max(5).default(0),
});

const blur = (n) => Math.round(n * 100) / 100; // about 1 km: exact professional location stays private

const router = Router();
router.use(protect, authorize('customer'));

router.get('/nearby', asyncHandler(async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError(400, 'Invalid search', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const { lat, lng, radiusKm, category, minExperience, minRating } = parsed.data;

  const rows = await Professional.aggregate([
    { $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] }, distanceField: 'distanceM', maxDistance: radiusKm * 1000, spherical: true,
        query: { status: 'approved', availability: { $ne: 'offline' }, experienceYears: { $gte: minExperience }, ...(minRating > 0 && { ratingAvg: { $gte: minRating } }), ...(category && { categories: category }) },
    } },
    { $limit: 30 },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { name: '$user.name', categories: 1, skills: 1, experienceYears: 1, bio: 1, city: 1, availability: 1, location: 1, distanceM: 1, ratingAvg: 1, ratingCount: 1 } },
  ]);

  const items = rows.map((r) => ({
    id: r._id, name: r.name, categories: r.categories, skills: r.skills, experienceYears: r.experienceYears, bio: r.bio, city: r.city,
    availability: r.availability, ratingAvg: r.ratingAvg || 0, ratingCount: r.ratingCount || 0, distanceKm: Math.round(r.distanceM / 100) / 10,
    location: { type: 'Point', coordinates: [blur(r.location.coordinates[0]), blur(r.location.coordinates[1])] },
  }));
  res.json({ success: true, data: { items } });
}));

export default router;
