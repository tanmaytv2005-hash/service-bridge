import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';

// Safe local defaults; production seeding requires credentials supplied outside the repo.
const isProduction = env.nodeEnv === 'production';
const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || 'Platform Admin',
  email: (process.env.SEED_ADMIN_EMAIL || (isProduction ? '' : 'admin@servicebridge.test')).trim().toLowerCase(),
  phone: process.env.SEED_ADMIN_PHONE || (isProduction ? '' : '9000000001'),
  password: process.env.SEED_ADMIN_PASSWORD || (isProduction ? '' : 'Admin12345'),
  role: 'admin',
  city: process.env.SEED_ADMIN_CITY || 'Shivamogga',
};

if (!ADMIN.email || !/^\d{10}$/.test(ADMIN.phone) || !ADMIN.password) {
  console.error('Set SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE, and SEED_ADMIN_PASSWORD before seeding a production admin.');
  process.exit(1);
}
if (isProduction && (ADMIN.password.length < 12 || Buffer.byteLength(ADMIN.password, 'utf8') > 72)) {
  console.error('Production admin password must be 12–72 UTF-8 bytes.');
  process.exit(1);
}

console.log(`Seeding admin into ${env.nodeEnv} database…`);
await connectDB();
const exists = await User.findOne({ email: ADMIN.email });
if (exists) console.log('Admin already exists, nothing to do.');
else {
  await User.create(ADMIN);
  console.log(`Admin created: ${ADMIN.email}${isProduction ? '' : ` / ${ADMIN.password}`}`);
}
await mongoose.disconnect();
