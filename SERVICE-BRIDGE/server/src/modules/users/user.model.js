import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['customer', 'professional', 'admin'], required: true },
  city: { type: String, required: true, trim: true, maxlength: 60 },
  status: { type: String, enum: ['active', 'suspended', 'removed'], default: 'active', index: true },
}, { timestamps: true });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function comparePassword(candidate) { return bcrypt.compare(candidate, this.password); };
userSchema.set('toJSON', { transform(_doc, value) { delete value.password; delete value.__v; return value; } });

export const User = mongoose.model('User', userSchema);
