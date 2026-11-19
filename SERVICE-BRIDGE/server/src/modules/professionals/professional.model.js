import mongoose from 'mongoose';

export const PRO_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'suspended', 'removed'];

const pointSchema = new mongoose.Schema(
  { type: { type: String, enum: ['Point'], required: true }, coordinates: { type: [Number], required: true } },
  { _id: false }
);

const professionalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, trim: true, maxlength: 500 },
    categories: [{ type: String, trim: true }], // becomes refs to ServiceCategories in Phase 3
    skills: [{ type: String, trim: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    serviceAreas: [{ type: String, trim: true }],
    city: { type: String, trim: true },
    location: pointSchema, // GeoJSON [lng, lat]
    availability: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    status: { type: String, enum: PRO_STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String, maxlength: 300 },
    removalReason: { type: String, maxlength: 300 },
    addedByAdmin: { type: Boolean, default: false, index: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    aadhaarLast4: { type: String, match: /^\d{4}$/ },
    aadhaarFingerprint: { type: String, select: false },
    aadhaarChecksumValid: { type: Boolean, default: false },
    aadhaarConsentAt: Date,
    aadhaarStatus: { type: String, enum: ['not_submitted', 'pending', 'approved', 'rejected'], default: 'not_submitted', index: true },
    aadhaarReviewNote: { type: String, maxlength: 300 },
    livePhotoData: { type: String, select: false, maxlength: 700000 }, // small demo JPEG, returned only by role-checked endpoints
    livePhotoCapturedAt: Date,
  },
  { timestamps: true }
);

professionalSchema.index({ location: '2dsphere' });
professionalSchema.index({ status: 1, categories: 1 });
professionalSchema.index({ aadhaarFingerprint: 1 }, { unique: true, sparse: true });

export const Professional = mongoose.model('Professional', professionalSchema);
