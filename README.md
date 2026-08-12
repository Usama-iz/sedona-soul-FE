# Sedona Soul FE

Sedona Soul FE is the frontend application for the Sedona Soul companion experience. It is built with Next.js App Router and provides public authentication flows, onboarding, the member app, and an admin workspace.

## What this app includes

- Public auth flows for sign in, sign up, invite acceptance, forgot password, and password reset
- Guided onboarding for newly activated users
- User application areas for home, today, guide, progress, partner, audiobook, and settings
- Admin areas for dashboard, users, reports, safety, audio, content, and settings
- PWA support with a web manifest, production service worker registration, and an offline fallback page

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Radix UI primitives
- NextAuth v5 beta

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file such as `.env.local` and add the required values.

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Environment variables

The current codebase expects the following environment variables:

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_ADMIN_EMAILS=
AUTH_TOKEN_SECRET=
AUTH_TOKEN_ISSUER=sedona-soul-web
AUTH_TOKEN_AUDIENCE=sedona-soul-api
NEXT_PUBLIC_API_BASE_URL=
BACKEND_API_URL=
```

### Notes

- `AUTH_SECRET` is required by NextAuth.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are required because Google is configured as an auth provider in the app.
- `AUTH_ADMIN_EMAILS` should be a comma-separated list of admin email addresses.
- `AUTH_TOKEN_SECRET` is used to sign the frontend-to-backend auth token and should be at least 32 characters long.
- `NEXT_PUBLIC_API_BASE_URL` is used by the browser-facing API client.
- `BACKEND_API_URL` is used by server-side proxy routes for backend requests.
- `AUTH_TOKEN_ISSUER` and `AUTH_TOKEN_AUDIENCE` are optional overrides for backend token claims.

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## App flow

- `/` redirects to `/app/home`
- Public routes live under the authentication and onboarding flows
- Signed-in users are routed through `/auth/redirect`
- Admin users are redirected to `/admin/dashboard`
- Standard users are redirected to `/app/home`

## Project structure

```text
src/app                 App Router routes and layouts
src/app/api             Route handlers and backend proxy endpoints
src/components          UI, auth, layout, onboarding, and PWA components
src/lib                 Auth, API, config, design, onboarding, and utility code
public                  Static assets, icons, manifest, offline page, and service worker
```

## PWA and offline behavior

The app includes a lightweight PWA setup:

- `public/manifest.webmanifest` defines install metadata, icons, theme colors, and shortcuts
- `public/sw.js` caches a small app shell and serves an offline fallback for navigation requests
- `public/offline.html` is the offline screen shown when a page request fails without a network connection
- The service worker is registered only in production

The current service worker intentionally avoids caching sensitive user content or admin data.

## Backend integration

The frontend talks to the backend in two ways:

- Browser-side requests use `NEXT_PUBLIC_API_BASE_URL`
- Server-side route handlers proxy selected auth and admin requests through `BACKEND_API_URL`

Authentication and user sync also rely on a signed token generated in the frontend and forwarded to the backend for protected flows.

## Development notes

- Admin access is determined by email addresses listed in `AUTH_ADMIN_EMAILS`.
- The app uses `next/font/google` for the `Newsreader` font in the root layout.
- Production builds need network access to fetch that font unless it is replaced with a local font setup.

## Status

This repository looks like an in-progress frontend foundation. Before shipping, make sure environment variables, backend endpoints, auth provider settings, and deployment metadata are all configured for the target environment.
