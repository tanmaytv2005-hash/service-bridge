import Razorpay from 'razorpay';
import { env } from './env.js';

export const razorpayEnabled = Boolean(env.razorpayKeyId && env.razorpayKeySecret);
export const razorpay = razorpayEnabled ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret }) : null;
