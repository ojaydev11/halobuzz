HaloBuzz Admin

Next.js 14 + TypeScript admin dashboard for HaloBuzz.

Environment

- NEXT_PUBLIC_API_BASE: Backend API base, e.g. `http://localhost:3001/api/v1`
- Backend must set `ADMIN_EMAILS` (comma-separated) to allow access to `/api/v1/admin/*`

Dev

- Install: `pnpm i` or `npm i`
- Run: `pnpm dev` or `npm run dev`
- Open: http://localhost:3000

Auth

- Login via `/login` → calls backend `/auth/login` and stores JWT in httpOnly cookie.
- Middleware protects `/dashboard/*` routes.

Deploy

- Set `NEXT_PUBLIC_API_BASE` to your backend URL.
- Ensure backend has `ADMIN_EMAILS` configured.
- Behind HTTPS, cookies are sent with `Secure` flag automatically when `NODE_ENV=production`.


