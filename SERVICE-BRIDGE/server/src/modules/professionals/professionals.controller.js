import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { Professional } from './professional.model.js';
import { VerificationDocument } from './document.model.js';
import { ServiceCategory } from '../categories/category.model.js';
import { User } from '../users/user.model.js';
import { notify } from '../notifications/notify.js';
import { fingerprintAadhaar, isAadhaarChecksumValid } from './aadhaar.js';

const EDITABLE = ['pending', 'rejected'];
const mine = (userId) => Professional.findOne({ userId });

async function notifyAdmins(payload) {
  try {
    const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
    await Promise.all(admins.map((admin) => notify(admin._id, payload)));
  } catch (error) {
    console.error('admin notification failed:', error.message);
  }
}

export const getMe = asyncHandler(async (req, res) => {
  const profile = await Professional.findOne({ userId: req.user._id }).select('+livePhotoData');
  const documents = profile ? await VerificationDocument.find({ professionalId: profile._id }) : [];
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, data: { profile, documents } });
});

export const saveAadhaar = asyncHandler(async (req, res) => {
  const { aadhaarNumber } = req.body;
  if (!isAadhaarChecksumValid(aadhaarNumber)) throw new ApiError(400, 'Aadhaar number is not checksum-valid. Check the digits and try again.');
  const fingerprint = fingerprintAadhaar(aadhaarNumber);
  const profile = await Professional.findOne({ userId: req.user._id }).select('+aadhaarFingerprint');
  if (!profile) throw new ApiError(400, 'Save your professional profile first');
  if (!EDITABLE.includes(profile.status)) throw new ApiError(409, 'Aadhaar details cannot be changed in the current application status');
  if (profile?.aadhaarStatus === 'approved') throw new ApiError(409, 'Your Aadhaar check is already approved and cannot be changed');
  const duplicate = await Professional.exists({ aadhaarFingerprint: fingerprint, _id: { $ne: profile._id } });
  if (duplicate) throw new ApiError(409, 'This Aadhaar number is already linked to another account');
  let updated;
  try {
    updated = await Professional.findOneAndUpdate(
      { _id: profile._id },
      { $set: { aadhaarLast4: aadhaarNumber.slice(-4), aadhaarFingerprint: fingerprint, aadhaarChecksumValid: true, aadhaarConsentAt: new Date(), aadhaarStatus: 'pending' }, $unset: { aadhaarReviewNote: 1 } },
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'This Aadhaar number is already linked to another account');
    throw error;
  }
  await notifyAdmins({
    type: 'verification',
    title: 'Aadhaar check awaiting review',
    body: `${req.user.name} submitted an Aadhaar check. Review the last four digits and camera photo.`,
    link: '/admin',
  });
  res.json({ success: true, data: { aadhaarLast4: updated.aadhaarLast4, aadhaarChecksumValid: updated.aadhaarChecksumValid, aadhaarStatus: updated.aadhaarStatus } });
});

export const saveLivePhoto = asyncHandler(async (req, res) => {
  const data = req.body.photoData;
  const bytes = Buffer.from(data.slice('data:image/jpeg;base64,'.length), 'base64');
  if (bytes.length > 400 * 1024 || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new ApiError(400, 'Photo must be a small JPEG captured with the camera');
  }
  const existing = await Professional.findOne({ userId: req.user._id }).select('status addedByAdmin livePhotoCapturedAt');
  if (!existing) throw new ApiError(400, 'Save your professional profile first');
  const canAddAdminPhoto = existing.addedByAdmin && existing.status === 'approved' && !existing.livePhotoCapturedAt;
  if (!EDITABLE.includes(existing.status) && !canAddAdminPhoto) throw new ApiError(409, 'The profile photo cannot be changed in the current application status');
  const p = await Professional.findOneAndUpdate(
    { userId: req.user._id },
    { livePhotoData: data, livePhotoCapturedAt: new Date() },
    { new: true, runValidators: true }
  );
  res.json({ success: true, data: { capturedAt: p.livePhotoCapturedAt } });
});

export const saveProfile = asyncHandler(async (req, res) => {
  const valid = await ServiceCategory.countDocuments({ slug: { $in: req.body.categories }, isActive: true });
  if (valid !== new Set(req.body.categories).size) throw new ApiError(400, 'One or more categories are invalid');
  const existing = await mine(req.user._id);
  if (existing && !EDITABLE.includes(existing.status)) throw new ApiError(409, 'Profile cannot be edited in its current status');
  const profile = await Professional.findOneAndUpdate(
    { userId: req.user._id },
    { ...req.body, userId: req.user._id },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: { profile } });
});

export const addDocument = asyncHandler(async (req, res) => {
  const p = await mine(req.user._id);
  if (!p) throw new ApiError(400, 'Save your profile first');
  if (!EDITABLE.includes(p.status)) throw new ApiError(409, 'Documents cannot be changed in the current status');
  if ((await VerificationDocument.countDocuments({ professionalId: p._id })) >= 5) throw new ApiError(400, 'Maximum 5 documents');
  const { docType, documentRef } = req.body;
  const doc = await VerificationDocument.create({
    professionalId: p._id, docType, documentRef, consentGiven: true,
    retentionUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
  res.status(201).json({ success: true, data: { document: doc } });
});

export const submit = asyncHandler(async (req, res) => {
  const p = await mine(req.user._id).select('+aadhaarFingerprint');
  if (!p) throw new ApiError(400, 'Save your profile first');
  if (!EDITABLE.includes(p.status)) throw new ApiError(409, 'Already submitted');
  if (!p.aadhaarFingerprint || !p.aadhaarChecksumValid) throw new ApiError(400, 'Submit a checksum-valid Aadhaar number with consent first');
  if (!p.livePhotoCapturedAt) throw new ApiError(400, 'Capture and save your live photo first');
  p.status = 'under_review';
  p.rejectionReason = undefined;
  await p.save();
  await notifyAdmins({
    type: 'verification',
    title: 'Professional application awaiting review',
    body: `${req.user.name} submitted an application for admin review.`,
    link: '/admin',
  });
  res.json({ success: true, data: { profile: p } });
});

export const setLocation = asyncHandler(async (req, res) => {
  const p = await Professional.findOneAndUpdate(
    { userId: req.user._id },
    { location: { type: 'Point', coordinates: [req.body.lng, req.body.lat] } },
    { new: true }
  );
  if (!p) throw new ApiError(400, 'Save your profile first');
  res.json({ success: true, data: { profile: p } });
});

export const setAvailability = asyncHandler(async (req, res) => {
  const p = await Professional.findOneAndUpdate({ userId: req.user._id }, { availability: req.body.availability }, { new: true });
  if (!p) throw new ApiError(400, 'Save your profile first');
  res.json({ success: true, data: { profile: p } });
});
