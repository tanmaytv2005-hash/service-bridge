import { Router } from 'express';
import { z } from 'zod';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ServiceCategory } from './category.model.js';
import { AuditLog } from '../admin/auditLog.model.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const createSchema = z.object({ name: z.string().trim().min(2).max(60) });
const updateSchema = z.object({ name: z.string().trim().min(2).max(60).optional(), isActive: z.boolean().optional(), commissionPercent: z.coerce.number().min(0).max(50).optional() });

const router = Router();
router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' && req.query.all === '1' ? {} : { isActive: true };
  res.json({ success: true, data: { items: await ServiceCategory.find(filter).sort({ name: 1 }) } });
}));

router.post('/', authorize('admin'), validate(createSchema), asyncHandler(async (req, res) => {
  const item = await ServiceCategory.create({ name: req.body.name, slug: slugify(req.body.name) });
  await AuditLog.create({ adminId: req.user._id, action: 'category_create', targetType: 'ServiceCategory', targetId: item._id });
  res.status(201).json({ success: true, data: { item } });
}));

router.patch('/:id', authorize('admin'), validate(updateSchema), asyncHandler(async (req, res) => {
  const item = await ServiceCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Category not found');
  if (req.body.name) item.name = req.body.name; // slug stays stable
  if (typeof req.body.isActive === 'boolean') item.isActive = req.body.isActive;
  if (typeof req.body.commissionPercent === 'number') item.commissionPercent = req.body.commissionPercent;
  await item.save();
  await AuditLog.create({ adminId: req.user._id, action: 'category_update', targetType: 'ServiceCategory', targetId: item._id });
  res.json({ success: true, data: { item } });
}));

export default router;
