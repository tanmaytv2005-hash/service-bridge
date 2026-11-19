# ServiceBridge

This folder combines the eight supplied phase archives in order. Shared files use the newest phase version; files omitted from a later archive are retained from the phase that introduced them. The supplied archives did not include the original server foundation files, so the missing authentication, user model, database connection, and shared middleware were recreated to match the later phase APIs.

## What is included

- Customer, professional, and admin web app
- Professional profiles, verification, locations, and categories
- Admin managed professional applications, direct adds, removals, Aadhaar review, and camera photos
- Service requests, quotations, bookings, OTP confirmation, payments, payouts, notifications, and video verification
- Reviews, complaints, and admin analytics
- MongoDB-backed API with cookie-based login and Socket.IO signalling

## Requirements

- Node.js 18 or newer and npm
- A MongoDB database (local MongoDB or MongoDB Atlas)
- Optional: Razorpay test credentials for payment checkout and webhooks
- Optional: Google Maps browser key for map tiles

## Configure

1. Open a terminal in `server` and create `.env` from `.env.example`.
2. Set `MONGO_URI` to your MongoDB connection string. For a local MongoDB server, use `mongodb://127.0.0.1:27017/servicebridge`.
3. Replace `JWT_SECRET` with a long random secret. Keep `.env` private.
4. Set `AADHAAR_FINGERPRINT_SECRET` to a separate long random secret and keep it unchanged. The demo uses it to create one-way Aadhaar duplicate fingerprints; losing or changing it prevents matching existing fingerprints.
5. Optionally set Razorpay test keys. Leave the values blank to run without payment checkout.
6. In `client`, create `.env` from `.env.example`. Set `VITE_GOOGLE_MAPS_KEY` only if you have a Google Maps JavaScript API key; the app also has a basic map view without it.

## Install and run

In one terminal:

```sh
cd server
npm install
npm run seed:admin
npm run seed:demo
npm run dev
```

In a second terminal:

```sh
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The API health check is at `http://localhost:5000/api/health`.

## Demo accounts

The seed scripts create demo data in the database configured by `server/.env`:

- Admin: `admin@servicebridge.test` / `Admin12345`
- Customer: `demo.customer@servicebridge.test` / `Demo12345`
- Professionals: `demo.pro1@servicebridge.test` through `demo.pro5@servicebridge.test` / `Demo12345`

These are development-only accounts. Change or remove them before deploying the app for real users. Never use real identity documents or live payment keys with this prototype.

## Professional approval and management

- A professional signup is an application. Customers see only professionals whose status is approved.
- An admin can add a professional from **Add professional**. The account is approved immediately and marked **Added by admin**. Give the temporary password to the professional privately. They can sign in and add a camera photo if one is not already available.
- An admin can remove a professional with a reason. Removal is blocked while confirmed, in-progress, or completion-pending bookings exist. Removal disables login, rejects the professional's open quotations, and keeps the profile, payment, and audit records.
- Professional applications need a profile, a submitted Aadhaar check, and a camera photo before they can be sent for review. An admin must approve the Aadhaar check and see a passed Phase 7 video verification before approving the application.
- Admins receive an in-app notification when a professional submits an Aadhaar check or sends an application for review. Open **Notifications** or the Admin dashboard to review it.

## Aadhaar and photo demo limits

Use only these synthetic demo numbers: `234567890124` and `345678901238`. They are checksum-valid examples for testing, not real identity numbers. The app checks 12-digit format and the built-in checksum; that only catches typing errors and does not prove identity. It stores only the last four digits and a one-way HMAC fingerprint, and does not log or save the full number. Do not use real Aadhaar numbers in this college demo. A real launch needs an authorized verification provider or DigiLocker; a private platform generally cannot verify Aadhaar directly without authorization.

The professional photo is captured through the browser camera, resized and stored as a small JPEG in MongoDB for this demo. Camera capture can be faked, so it is not proof of liveness. A real launch should use private image storage and a liveness provider. The photo is returned to the professional and admins, and to the customer only through their own active booking for that assigned professional.

## Commission settings

Admins can set each service category's commission from 0% to 50% on **Service categories**. New categories default to 15%. The rate is saved on a payment when checkout starts, so later rate changes do not affect that payment. Earnings and admin payment screens show the actual commission and professional share.

## Notes

- `client/.env` values are read when Vite starts; restart the client after changing them.
- Payment checkout needs Razorpay test keys. The rest of the app can run without them.
- Video calls use browser camera/microphone permissions and are most reliable on localhost or HTTPS.
- MongoDB must be running and reachable before starting the API or running seed commands.
