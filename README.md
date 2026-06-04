# Unila Digital Sign

Platform tanda tangan digital resmi Universitas Lampung — memungkinkan dosen dan mahasiswa mengajukan Digital ID, menandatangani dokumen secara digital, dan memverifikasi keaslian dokumen.

## Run & Operate

- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run API server (port 8080)
- `PORT=21426 BASE_PATH=/ pnpm --filter @workspace/unila-digital-sign run dev` — run frontend (port 21426)
- `./dev.sh` — run both API server and frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- OTP: speakeasy (TOTP) + qrcode
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Project Structure

```bash
.
├── artifacts
│   ├── api-server                  # API server source code
│   │   └── src
│   │       ├── lib                 # Auth utilities
│   │       ├── middlewares         # Request middlewares
│   │       ├── routes              # API routes
│   │       ├── app.ts
│   │       └── index.ts
│   └── unila-digital-sign          # Frontend source code
│       ├── public                  # Static assets
│       ├── src
│       │   ├── components          # React components
│       │   │   ├── layout
│       │   │   └── ui
│       │   ├── lib                 # Auth utilities
│       │   ├── pages               # React pages
│       │   │    └── admin
│       │   ├── App.tsx
│       │   ├── index.css
│       │   └── main.tsx
│       └── vite.config.ts
├── lib                             # Shared utilities and libraries
│   └── db                          # Database schema and utilities
│       └── src
│           └── schema
├── .env                            # Environment variables
└── README.md
```

## Product

- **Login** — email/password + OTP verification (Google Authenticator)
- **OTP Setup** — QR code or manual secret code entry
- **CA Certificate** — download Unila CA cert (.crt) for Adobe/Foxit import
- **Digital ID** — request certificate (name, role, email, passphrase) → admin approve/reject → download .p12
- **Signature** — upload image or draw on canvas
- **Sign Document** — upload PDF, position signature on page mockup, enter OTP → admin approve/reject
- **Verify Document** — upload document to check authenticity
- **Admin Dashboard** — approve/reject Digital ID and sign requests, manage users

## User preferences

- UI language: Bahasa Indonesia
- Color scheme: White and blue (Universitas Lampung brand)
- Logo: `artifacts/unila-digital-sign/public/Logo-unila.png`

## Installation & Running

1. Clone the repository
```
git clone https://github.com/Rifanism/unila-digital-sign.git
```
2. Install dependencies
```
cd Unila-Digital-Sign
pnpm install
```
3. Push database schema (postgresql)
```
psql -U <username> -c "CREATE DATABASE unila_digital_sign;"
pnpm --filter @workspace/db run push
```
4. Environment variables
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/unila_digital_sign
SESSION_SECRET=random string
```
5. Run
```
./dev.sh
```
