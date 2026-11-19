import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';

// Development-only fake admin. Change the password before any real deployment.
const ADMIN = { name: 'Platform Admin', email: 'admin@servicebridge.test', phone: '9000000001', password: 'Admin12345', role: 'admin', city: 'Shivamogga' };

console.log(`Seeding admin into ${env.nodeEnv} database…`);
await connectDB();
const exists = await User.findOne({ email: ADMIN.email });
if (exists) console.log('Admin already exists, nothing to do.');
else { await User.create(ADMIN); console.log(`Admin created: ${ADMIN.email} / ${ADMIN.password}`); }
await mongoose.disconnect();
