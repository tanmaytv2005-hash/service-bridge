import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Production tokens and Aadhaar fingerprints must use independent, stable secrets.
if (nodeEnv === 'production') {
  if (Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
    console.error('JWT_SECRET must be at least 32 bytes in production');
    process.exit(1);
  }
  if (Buffer.byteLength(process.env.AADHAAR_FINGERPRINT_SECRET || '', 'utf8') < 32) {
    console.error('AADHAAR_FINGERPRINT_SECRET must be at least 32 bytes in production');
    process.exit(1);
  }
  if (process.env.AADHAAR_FINGERPRINT_SECRET === process.env.JWT_SECRET) {
    console.error('AADHAAR_FINGERPRINT_SECRET must be different from JWT_SECRET');
    process.exit(1);
  }
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL,
  // Optional: payments return a clear 503 message until these are set
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  // Explicit opt-in for returning mock OTPs from a publicly reachable demo deployment.
  demoOtpEcho: process.env.DEMO_OTP_ECHO === 'true',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@servicebridge.test',
};
