import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Professional, PRO_STATUSES } from '../professionals/professional.model.js';
import { VerificationDocument } from '../professionals/document.model.js';
import { AuditLog } from './auditLog.model.js';
import { VideoVerification } from '../videoVerification/videoVerification.model.js';
import { notify } from '../notifications/notify.js';
import { User } from '../users/user.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Quotation } from '../quotations/quotation.model.js';
import { ServiceCategory } from '../categories/category.model.js';
import { z } from 'zod';

const addSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^\d{10}$/),
  city: z.string().trim().min(2).max(60),
  tempPassword: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
  categories: z.array(z.string().trim().min(1)).min(1).max(5),
  skills: z.array(z.string().trim().min(1)).max(15).default([]),
  experienceYears: z.coerce.number().int().min(0).max(60).default(0),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
}).refine((v) => (v.lat === undefined) === (v.lng === undefined), { message: 'Enter both latitude and longitude, or leave both blank' });

const RULES = {
  approve: { to: 'approved', from: ['under_review', 'suspended'] },
  reject: { to: 'rejected', from: ['under_review'] },
  suspend: { to: 'suspended', from: ['approved', 'under_review'] },
};

export const listProfessionals = asyncHandler(async (req, res) => {
  const status = PRO_STATUSES.includes(req.query.status) ? req.query.status : 'under_review';
  const items = await Professional.find({ status }).populate('userId', 'name email phone').sort({ updatedAt: 1 }).limit(50);
  res.json({ success: true, data: { items } });
});

export const getProfessional = asyncHandler(async (req, res) => {
  const profile = await Professional.findById(req.params.id).select('+livePhotoData').populate('userId', 'name email phone status');
  if (!profile) throw new ApiError(404, 'Professional not found');
  const documents = await VerificationDocument.find({ professionalId: profile._id });
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, data: { profile, documents } });
});

export const addProfessional = asyncHandler(async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Please check the submitted information', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const data = parsed.data;
  const uniqueCategories = [...new Set(data.categories)];
  if (uniqueCategories.length !== data.categories.length || (await ServiceCategory.countDocuments({ slug: { $in: uniqueCategories }, isActive: true })) !== uniqueCategories.length) {
    throw new ApiError(400, 'Choose valid active service categories');
  }
  if (await User.exists({ $or: [{ email: data.email.toLowerCase() }, { phone: data.phone }] })) throw new ApiError(409, 'An account with this email or phone already exists');

  const user = await User.create({ name: data.name, email: data.email.toLowerCase(), phone: data.phone, city: data.city, password: data.tempPassword, role: 'professional' });
  let profile;
  try {
    profile = await Professional.create({
      userId: user._id, city: data.city, categories: uniqueCategories, skills: data.skills, experienceYears: data.experienceYears,
      status: 'approved', addedByAdmin: true, addedBy: req.user._id,
      availability: 'available',
      ...(data.lat !== undefined && { location: { type: 'Point', coordinates: [data.lng, data.lat] } }),
    });
    await AuditLog.create({ adminId: req.user._id, action: 'professional_added', targetType: 'Professional', targetId: profile._id, reason: 'Added directly by admin' });
    return res.status(201).json({ success: true, data: { profile: await profile.populate('userId', 'name email phone') } });
  } catch (error) {
    if (profile) await Professional.deleteOne({ _id: profile._id });
    await User.deleteOne({ _id: user._id });
    throw error;
  }
});

export const reviewAadhaar = asyncHandler(async (req, res) => {
  const schema = z.object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().min(3).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'Choose approve or reject and enter a note', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const p = await Professional.findById(req.params.id);
  if (!p) throw new ApiError(404, 'Professional not found');
  if (p.aadhaarStatus !== 'pending') throw new ApiError(409, 'There is no pending Aadhaar check to review');
  if (!p.aadhaarLast4 || !p.aadhaarChecksumValid || !p.livePhotoCapturedAt) throw new ApiError(409, 'A valid Aadhaar check and live photo are required');
  p.aadhaarStatus = parsed.data.decision === 'approve' ? 'approved' : 'rejected';
  p.aadhaarReviewNote = parsed.data.note;
  await p.save();
  await AuditLog.create({ adminId: req.user._id, action: `aadhaar_${parsed.data.decision}`, targetType: 'Professional', targetId: p._id, reason: parsed.data.note });
  await notify(p.userId, { type: 'verification', title: `Aadhaar check ${p.aadhaarStatus}`, body: parsed.data.note, link: '/professional' });
  res.json({ success: true, data: { aadhaarStatus: p.aadhaarStatus, note: p.aadhaarReviewNote } });
});

export const removeProfessional = asyncHandler(async (req, res) => {
  const schema = z.object({ reason: z.string().trim().min(3).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, 'A removal reason is required');
  const p = await Professional.findById(req.params.id);
  if (!p) throw new ApiError(404, 'Professional not found');
  if (p.status === 'removed') throw new ApiError(409, 'This professional is already removed');
  if (await Booking.exists({ professionalId: p._id, status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING'] } })) {
    throw new ApiError(409, 'This professional has active bookings. Complete or cancel them before removal.');
  }
  const user = await User.findById(p.userId);
  if (!user) throw new ApiError(409, 'Professional account was not found');
  p.status = 'removed';
  p.removalReason = parsed.data.reason;
  p.reviewedBy = req.user._id;
  p.reviewedAt = new Date();
  user.status = 'removed';
  await Promise.all([p.save(), user.save()]);
  const rejected = await Quotation.updateMany({ professionalId: p._id, status: 'submitted' }, { $set: { status: 'rejected' } });
  await AuditLog.create({ adminId: req.user._id, action: 'professional_removed', targetType: 'Professional', targetId: p._id, reason: parsed.data.reason });
  res.json({ success: true, data: { profile: p, rejectedQuotationCount: rejected.modifiedCount } });
});

export const decide = asyncHandler(async (req, res) => {
  const { decision, reason } = req.body;
  const rule = RULES[decision];
  const p = await Professional.findById(req.params.id).select('+aadhaarFingerprint');
  if (!p) throw new ApiError(404, 'Professional not found');
  if (!rule.from.includes(p.status)) throw new ApiError(409, `Cannot ${decision} a professional who is ${p.status}`);
  if (decision === 'approve') {
    if (!p.aadhaarFingerprint || p.aadhaarStatus !== 'approved' || !p.aadhaarChecksumValid) throw new ApiError(409, 'Approve the Aadhaar check before approving this professional');
    if (!p.livePhotoCapturedAt) throw new ApiError(409, 'A saved live photo is required before approval');
    if (!(await VideoVerification.exists({ professionalId: p._id, status: 'COMPLETED', result: 'PASSED' }))) throw new ApiError(409, 'Complete a passed live video verification before approving');
  }
  p.status = rule.to;
  p.rejectionReason = decision === 'approve' ? undefined : reason;
  p.reviewedBy = req.user._id;
  p.reviewedAt = new Date();
  await p.save();
  await AuditLog.create({ adminId: req.user._id, action: decision, targetType: 'Professional', targetId: p._id, reason });
  await notify(p.userId, { type: 'verification', title: `Your profile was ${rule.to}`, body: reason || 'You can now receive customer requests.', link: '/professional' });
  res.json({ success: true, data: { profile: p } });
});
