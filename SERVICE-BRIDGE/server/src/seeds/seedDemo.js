import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Professional } from '../modules/professionals/professional.model.js';
import { ServiceCategory } from '../modules/categories/category.model.js';

// Fake development data only.
const CATS = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'AC repair', 'Home cleaning', 'Appliance repair'];
const PROS = [
  { name: 'Demo Plumber One', phone: '9000000011', city: 'Shivamogga', cat: 'plumbing', exp: 6, lat: 13.935, lng: 75.56 },
  { name: 'Demo Electrician One', phone: '9000000012', city: 'Shivamogga', cat: 'electrical', exp: 4, lat: 13.91, lng: 75.58 },
  { name: 'Demo Carpenter One', phone: '9000000013', city: 'Shivamogga', cat: 'carpentry', exp: 9, lat: 13.965, lng: 75.53 },
  { name: 'Demo Electrician Two', phone: '9000000014', city: 'Bengaluru', cat: 'electrical', exp: 7, lat: 12.975, lng: 77.59 },
  { name: 'Demo AC Technician', phone: '9000000015', city: 'Bengaluru', cat: 'ac-repair', exp: 5, lat: 12.94, lng: 77.62 },
];

await connectDB();
for (const name of CATS) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await ServiceCategory.updateOne({ slug }, { $setOnInsert: { name, slug } }, { upsert: true });
}
for (const [i, p] of PROS.entries()) {
  const email = `demo.pro${i + 1}@servicebridge.test`;
  if (await User.findOne({ email })) continue;
  const user = await User.create({ name: p.name, email, phone: p.phone, password: 'Demo12345', role: 'professional', city: p.city });
  await Professional.create({
    userId: user._id, categories: [p.cat], skills: ['Demo skill'], experienceYears: p.exp, city: p.city, status: 'approved',
    availability: 'available', location: { type: 'Point', coordinates: [p.lng, p.lat] },
  });
}
if (!(await User.findOne({ email: 'demo.customer@servicebridge.test' }))) await User.create({ name: 'Demo Customer', email: 'demo.customer@servicebridge.test', phone: '9000000021', password: 'Demo12345', role: 'customer', city: 'Shivamogga' });
console.log('Demo categories and professionals ready (password for demo professionals: Demo12345)');
await mongoose.disconnect();
