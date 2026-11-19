import crypto from 'crypto';
import { env } from '../../config/env.js';

const D = [
  [0,1,2,3,4,5,6,7,8,9], [1,2,3,4,0,6,7,8,9,5], [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7], [4,0,1,2,3,9,5,6,7,8], [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2], [7,6,5,9,8,2,1,0,4,3], [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const P = [
  [0,1,2,3,4,5,6,7,8,9], [1,5,7,6,2,8,3,0,9,4], [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7], [9,4,5,3,1,2,6,8,7,0], [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5], [7,0,4,6,9,1,3,2,5,8],
];

export function isAadhaarChecksumValid(value) {
  if (!/^\d{12}$/.test(value) || value[0] === '0' || value[0] === '1') return false;
  let c = 0;
  const digits = value.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = D[c][P[i % 8][digits[i]]];
  return c === 0;
}

export function fingerprintAadhaar(value) {
  const secret = process.env.AADHAAR_FINGERPRINT_SECRET || env.jwtSecret;
  return crypto.createHmac('sha256', secret).update(`servicebridge-aadhaar:${value}`).digest('hex');
}
