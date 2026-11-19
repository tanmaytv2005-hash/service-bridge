import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['REQUESTED', 'LIVE', 'COMPLETED'], default: 'REQUESTED', index: true },
    result: { type: String, enum: ['PENDING', 'PASSED', 'FAILED'], default: 'PENDING' },
    notes: { type: String, maxlength: 500 },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);
// At most one waiting request per professional
schema.index({ professionalId: 1 }, { unique: true, partialFilterExpression: { status: 'REQUESTED' } });

export const VideoVerification = mongoose.model('VideoVerification', schema);
