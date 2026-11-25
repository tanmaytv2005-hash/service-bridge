# ServiceBridge

ServiceBridge is a web application prototype for connecting customers who need home services with nearby service professionals. Customers describe a job and compare quotations; approved professionals discover eligible nearby requests and submit prices; administrators manage professional applications, service categories, payments, and platform oversight.

> **Project status:** This repository contains an implemented prototype intended for development and demonstration. Review the limitations and security notes before exposing it to real users. Payment checkout requires Razorpay configuration, and production OTP delivery requires an SMS provider that is not included here.

## Contents

- [Problem and approach](#problem-and-approach)
- [Implemented capabilities](#implemented-capabilities)
- [Architecture and technology](#architecture-and-technology)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Setup](#setup)
- [Configuration](#configuration)
- [Database and seed data](#database-and-seed-data)
- [Web application routes](#web-application-routes)
- [API overview](#api-overview)
- [Security and privacy](#security-and-privacy)
- [Deployment guidance](#deployment-guidance)
- [Scripts](#scripts)
- [Contributing and team](#contributing-and-team)
- [Limitations and future work](#limitations-and-future-work)

## Problem and approach

Finding a suitable local service professional can involve scattered contact channels, unclear pricing, and limited visibility into availability. ServiceBridge models a single workflow for service discovery and job coordination: a customer submits a categorized request with a preferred date, time, location, and urgency; nearby eligible professionals send quotations; the customer selects one to create a booking; and both parties track the booking through arrival and completion confirmation.

The application also includes administrator workflows for professional review, service categories, complaints, analytics, payment review, refunds, and payout records. These are prototype workflows and should not be interpreted as proof of identity, payment settlement, or regulatory compliance.

## Implemented capabilities

### Customer

- Register, sign in, and use a role-protected customer dashboard.
- Browse active service categories and search for approved nearby professionals using location, category, experience, and rating filters.
- Create, view, and cancel open service requests. Requests include a description, address, coordinates, preferred date and time, urgency, and optional instructions.
- Review quotations and professional summaries, then accept a quotation to create a booking. The request and accepted quotation are protected against multiple acceptances.
- View bookings, confirm professional arrival and job completion using one-time codes, pay for completed services through the configured Razorpay flow, request refunds, submit reviews, and file complaints.
- View notifications, enable browser push notifications where configured, and view a referral code and referral status.

### Service professional

- Register and manage a professional profile, service categories, skills, experience, documents, service location, and availability.
- Submit a profile for administrator review. Professional approval includes Aadhaar-check review and a passed live video verification in the implemented review flow.
- Browse eligible open requests within the configured 25 km matching range and send a quotation with price, optional estimated time, and message.
- Manage bookings, confirm arrival and completion with customer-provided OTPs, view earnings and payout records, and view customer reviews.
- Use live video verification with an administrator through browser camera and microphone permissions.

### Administrator

- Review professional applications and Aadhaar-check status; approve, reject, add, inspect, or remove professional accounts.
- Manage service categories and category commission rates.
- Review payment and refund requests, complaint records, payout records, video verification sessions, and platform analytics.
- Mark payouts as paid with a reference. This records an administrative status; it does not itself transfer funds.

### Platform behavior

- Role-based REST API authentication and Socket.IO authentication use the same signed session token.
- Booking lifecycle state changes use OTPs for arrival and completion. OTPs expire after five minutes, are limited to three generations per step, have a one-minute request cooldown, and allow a bounded number of verification attempts.
- Razorpay order creation, signature verification, webhook processing, commission snapshots, payment records, and refund decisions are implemented. The gateway must be configured to use checkout.
- In-app notifications, optional Web Push subscriptions, audit records for selected administrative actions, and WebRTC signalling for verification sessions are included.
- The client is configured as an installable web app with a manifest and service worker.

## Architecture and technology

The repository has two independently installed applications:

- **Client:** React 18 single-page application, React Router, Axios, and Vite. It communicates with the API using JSON and credentialed requests; Socket.IO is used for real-time signalling and notification-related events.
- **Server:** Node.js ES modules and Express 4 REST API. Mongoose connects the API to MongoDB. Socket.IO is attached to the same HTTP server.
- **Validation and security middleware:** Zod request validation, Helmet, CORS restricted to the configured client origin, cookie parsing, MongoDB operator sanitization, rate limiting on authentication and OTP flows, and centralized error handling.
- **External integrations:** Razorpay for payment orders and refunds, optional Google Maps browser key for map display, optional Web Push VAPID keys, and browser media APIs for live video verification.

## Repository layout

```text
client/
  public/                  PWA manifest, service worker, and static assets
  src/
    components/            Shared UI components
    pages/                 Customer, professional, and administrator screens
    App.jsx                Client route configuration
    api.js                 API client configuration
    AuthContext.jsx        Client authentication state
server/
  src/
    config/                 Environment and MongoDB/Razorpay setup
    middleware/             Authentication, validation, and error handling
    modules/                Feature routes, models, and services
    seeds/                  Administrator and development demo seed scripts
    sockets/                Socket.IO authentication and video signalling
    app.js                  Express middleware and API route mounting
    server.js               Database, HTTP server, and Socket.IO startup
```

## Requirements

- Node.js 18 or newer and npm.
- A reachable MongoDB database, either a local instance or a MongoDB Atlas deployment.
- A current browser. Camera, microphone, and geolocation permissions are needed for the related features.
- Optional service credentials for Razorpay test mode, Google Maps, and Web Push.

## Setup

Clone the repository and open two terminals from its root directory.

### 1. Configure the server

```sh
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and fill in the required values described in [Configuration](#configuration). For local MongoDB, a development URI can use this form:

```text
mongodb://127.0.0.1:27017/servicebridge
```

Start MongoDB, then seed the administrator and optional demo records:

```sh
npm run seed:admin
npm run seed:demo
```

Start the API in development mode:

```sh
npm run dev
```

The API listens on port `5000` by default. Its health endpoint is `http://localhost:5000/api/health`.

### 2. Configure and start the client

In the second terminal:

```sh
cd client
npm install
```

Copy `client/.env.example` to `client/.env`. The default local API URL is already represented in that example. Start Vite:

```sh
npm run dev
```

Open the local URL printed by Vite (configured for port `5173`). The API's `CLIENT_URL` must exactly match the origin used by the browser. Restart Vite after changing client environment variables.

## Configuration

Use placeholders in documentation and keep real values in ignored local `.env` files or your deployment secret manager. Do not commit secrets.

### Server (`server/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No | Runtime mode; use `production` for deployment. |
| `PORT` | No | HTTP listening port; defaults to `5000`. |
| `MONGO_URI` | Yes | MongoDB connection URI. |
| `JWT_SECRET` | Yes | Signs authentication tokens. In production it must be at least 32 bytes. |
| `JWT_EXPIRES_IN` | No | Token lifetime accepted by `jsonwebtoken`; defaults to `7d`. |
| `CLIENT_URL` | Yes | Exact client origin allowed by CORS and cookie-backed mutation checks. |
| `AADHAAR_FINGERPRINT_SECRET` | Production | Independent stable secret for one-way Aadhaar fingerprints; at least 32 bytes in production and different from `JWT_SECRET`. |
| `DEMO_OTP_ECHO` | No | Explicit demo-only setting to allow mock OTP echo in production. Keep false for real deployments; an SMS provider is not implemented. |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID. Both Razorpay keys are needed for checkout. |
| `RAZORPAY_KEY_SECRET` | No | Razorpay API secret. Keep private. |
| `RAZORPAY_WEBHOOK_SECRET` | No | Secret used to verify Razorpay webhooks. |
| `VAPID_PUBLIC_KEY` | No | Web Push public key. |
| `VAPID_PRIVATE_KEY` | No | Web Push private key. Keep private. |
| `VAPID_SUBJECT` | No | Web Push contact subject, typically a `mailto:` URI. |
| `SEED_ADMIN_EMAIL` | No | Admin seed account email; required when seeding in production. |
| `SEED_ADMIN_PHONE` | No | Admin seed account phone; required when seeding in production. |
| `SEED_ADMIN_PASSWORD` | No | Admin seed password; required when seeding in production. |
| `SEED_ADMIN_NAME` | No | Optional admin seed display name. |
| `SEED_ADMIN_CITY` | No | Optional admin seed city. |

Generate your own strong, unique secrets for the deployment environment. Do not reuse the sample or demo values as production credentials.

### Client (`client/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No | API base URL, including the `/api` path. |
| `VITE_GOOGLE_MAPS_KEY` | No | Browser key for Google Maps features; restrict it to the deployed origins and required APIs. |

Variables prefixed with `VITE_` are bundled into client code and are public. Never put private keys or server secrets in the client environment.

## Database and seed data

Mongoose connects to the database named in `MONGO_URI`. Ensure that the database service is reachable before starting the API or running seed scripts. MongoDB geospatial indexes support nearby professional and request matching; indexes are declared by the models and created through Mongoose.

`npm run seed:admin` creates the configured administrator if an account with that email does not already exist. In development it has local fallback values; production seeding requires explicit seed credentials and a password of at least 12 characters. `npm run seed:demo` creates sample categories, professionals, and a customer, and refuses to run when `NODE_ENV=production`. Use only synthetic data for demonstrations. Inspect the seed scripts before using them against any non-development database.

## Web application routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login`, `/register` | Public | Account access |
| `/terms` | Public | Terms page |
| `/customer` | Customer | Customer dashboard |
| `/customer/requests`, `/customer/requests/new`, `/customer/requests/:id` | Customer | Create and manage requests and quotations |
| `/customer/referrals` | Customer | Referral status |
| `/professional` | Professional | Professional dashboard |
| `/professional/requests`, `/professional/earnings`, `/professional/reviews` | Professional | Requests, earnings, and reviews |
| `/bookings` | Customer or professional | Booking lifecycle |
| `/notifications` | Signed-in user | Notifications |
| `/admin` | Admin | Admin dashboard |
| `/admin/categories`, `/admin/professionals/new` | Admin | Categories and direct professional creation |
| `/admin/payments`, `/admin/video`, `/admin/complaints`, `/admin/analytics` | Admin | Payment, verification, complaint, and analytics views |

Unknown client paths display a not-found message.

## API overview

All REST routes are mounted under `/api`. The API returns JSON; most protected routes accept the session cookie used by the browser or a bearer token through the shared authentication middleware. The route files define request validation, role checks, and response details.

| Base path | Main operations |
| --- | --- |
| `GET /api/health` | Health check |
| `/api/auth` | `POST /register`, `POST /login`, `GET /me`, `POST /logout` |
| `/api/professionals` | `GET /me`, profile, Aadhaar, live photo, documents, submission, location, and availability updates |
| `/api/admin` | Admin professional list/detail/add/remove and application/Aadhaar decisions |
| `/api/admin/analytics` | Admin analytics summary |
| `/api/categories` | List categories; admin create and update categories/commission |
| `/api/locations` | Customer nearby professional search (`GET /nearby`) |
| `/api/service-requests` | Customer create/list/detail/cancel; professional eligible request list |
| `/api/quotations` | Approved professionals submit quotations (`POST /`) |
| `/api/bookings` | Customer accepts quotation; customer/professional list, cancel, and professional-photo access; professional marks work ready |
| `/api/otp` | Generate or verify arrival/completion OTPs for a booking |
| `/api/payments` | Create order, verify payment, list own/admin payments, request refunds, and decide refund requests |
| `POST /api/payments/webhook` | Razorpay webhook with raw-body signature validation |
| `/api/payouts` | Professional own payouts; admin list and mark paid |
| `/api/referrals` | Customer referral status (`GET /mine`) |
| `/api/notifications` | List/read notifications and configure/remove push subscriptions |
| `/api/video-verification` | Professional request/status; admin session list, start, and record result |
| `/api/reviews` | Customer submit review; professional list own reviews; customer/admin view professional reviews |
| `/api/complaints` | Customer/professional create/list own complaints; admin list and update |

For exact endpoint parameters and authorization rules, see the corresponding `server/src/modules/*/*.routes.js` file. The video call media stream is peer-to-peer WebRTC in the browser; Socket.IO carries session authorization and signalling, not recorded video.

## Security and privacy

- Keep server `.env` files, JWT and fingerprint secrets, payment credentials, VAPID private keys, and production seed credentials private. The repository ignore rules exclude `.env` files while allowing `.env.example` templates.
- Use a unique production `JWT_SECRET` and a separate stable `AADHAAR_FINGERPRINT_SECRET`. Changing the fingerprint secret prevents matching previously stored Aadhaar fingerprints.
- The app hashes passwords, validates request bodies, sanitizes MongoDB query operators, sets Helmet headers, limits selected authentication/OTP requests, restricts credentialed CORS to `CLIENT_URL`, and checks browser mutation origins when a session cookie is used. Deploy behind HTTPS and configure the hosting proxy correctly.
- Aadhaar handling is a demo check: the app validates number format/checksum, stores the last four digits and a one-way HMAC fingerprint, and does not establish identity. Use only synthetic demo data. A real service requires an authorized verification process and legal/privacy review.
- Camera photos are stored as JPEG data in MongoDB for the prototype. Browser capture can be faked and is not liveness proof. A production system needs private object storage, access controls, retention rules, and a liveness provider if required.
- OTPs are stored as keyed hashes, expire, and are rate-limited. No SMS delivery provider is implemented. Do not enable production OTP echo for real users.
- Use Razorpay test credentials for demonstrations. Configure and verify webhook secrets; never trust client payment status alone. The app verifies payment signatures and webhook signatures server-side.
- Exact customer coordinates and address are withheld from professionals browsing requests; professional search results round coordinates. Validate privacy behavior against your deployment and data handling requirements before launch.

## Deployment guidance

This repository does not include a deployment manifest or a documented hosted deployment. A deployment should provide a Node.js 18+ runtime, MongoDB, a built static client host, HTTPS, and a process manager or managed application service.

1. Build the client with `npm run build` in `client`; the deployable static files are written to `client/dist/`.
2. Run `npm start` in `server` with production environment variables and network access to MongoDB.
3. Set `CLIENT_URL` to the exact HTTPS origin serving the client. Set `VITE_API_URL` at client build time to the public API base URL ending in `/api`.
4. Configure Razorpay test mode and webhook URL/secret before enabling payment testing. Configure a real SMS provider before enabling any production OTP delivery; this codebase currently has no such provider.
5. Set independent strong production secrets, restrict Google Maps browser keys by origin, use a stable VAPID key pair if push notifications are enabled, and restrict database and hosting access.
6. Use HTTPS for cookies and camera/microphone access. Confirm proxy and cookie behavior, CORS origins, database backups, logs, monitoring, and secrets management with the selected host.
7. Do not run the demo seed script in production. Seed an admin only with explicit production credentials and an intentional production database target.

Deployment is guidance only; no provider-specific configuration has been verified here.

## Scripts

### Client (`client/package.json`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on port `5173`. |
| `npm run build` | Build static client assets into `dist/`. |
| `npm run preview` | Preview a previously built client locally. |

### Server (`server/package.json`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Nodemon. |
| `npm start` | Start the API with Node.js. |
| `npm run seed:admin` | Create the configured administrator if absent. |
| `npm run seed:demo` | Create synthetic development categories, users, and professionals; disabled in production. |

## Contributing and team

No named maintainers, contributor guide, or team roster is defined in the repository. Contributions should follow the existing client/server separation and feature-module layout. Before submitting a change, describe the user-facing behavior and configuration impact, keep credentials and real identity data out of commits, and include appropriate verification steps. Add or update tests when a test suite is introduced; no test script is currently defined in either package manifest.

## Limitations and future work

The repository implements the prototype workflows listed above, but it is not a production-ready marketplace. In particular:

- OTPs are displayed by the application for development/demo use; SMS delivery and production OTP operations need an external provider and operational safeguards.
- Aadhaar format/checksum validation and camera-photo capture do not verify a person's identity or liveness.
- Professional payouts are recorded and marked by an administrator; automated bank payout integration is not present.
- Refunds use a Razorpay gateway call when configured, but payment processing and reconciliation still require production operational review.
- The current demo seed data and fallback development admin credentials are not suitable for deployment.
- No automated test suite, CI configuration, deployment manifest, or provider-specific deployment guide is present in the repository.
- Referral rewards are represented in application records; no external referral payout integration is present.
- Availability, notification delivery, map display, and browser media behavior depend on user permissions, browser support, and optional service configuration.

Potential follow-up work includes adding SMS delivery, authorized identity checks, private media storage and retention, automated payout/reconciliation, a test suite and CI checks, and deployment-specific infrastructure documentation. These are recommendations, not claims of existing functionality.
