import mongoose from 'mongoose';

// Demo only: stores a dummy reference, never a real Aadhaar/PAN number or a file.
const documentSchema = new mongoose.Schema(
  {
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true, index: true },
    docType: { type: String, enum: ['identity', 'address', 'skill_certificate'], required: true },
    documentRef: { type: String, required: true, trim: true, maxlength: 30 },
    consentGiven: { type: Boolean, required: true },
    retentionUntil: { type: Date, required: true },
  },
  { timestamps: true }
);

export const VerificationDocument = mongoose.model('VerificationDocument', documentSchema);
