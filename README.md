# Cloudly

Cloudly is a modern cloud storage solution allowing users to securely upload, manage, and share files upto 20GB completely for free. It features **direct client-to-S3 uploads using presigned URLs**, ensuring high performance and scalability. It is built as a monorepo using Turborepo, featuring a Next.js frontend and an Express.js/Node.js backend.

## Structure

- `apps/web`: Next.js frontend application.
- `apps/api`: Node.js/Express backend server.
- `packages/ui`: Shared UI components.

## Getting Started

### Prerequisites

- Node.js
- pnpm (recommended)
- MongoDB
- AWS S3 Bucket
- Clerk Account (for authentication)

### Installation

Install dependencies from the root directory:

```sh
pnpm install
```

---

## 1. Web Setup (`apps/web`)

Navigate to the web directory:

```sh
cd apps/web
```

### Environment Variables

Create a `.env.local` file in `apps/web` with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/drive
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/drive

# API Connection
NEXT_PUBLIC_API_BASE_URL=http://localhost:4001
```

### Run Web App

```sh
pnpm dev
# Runs on http://localhost:3000
```

---

## 2. API Setup (`apps/api`)

Navigate to the api directory:

```sh
cd apps/api
```

### Environment Variables

Create a `.env` file in `apps/api` with the following variables:

```bash
# Server Configuration
PORT=4001
FRONTEND_URL=http://localhost:3000

# Database
CLOUDLY_DB=mongodb+srv://... (Your MongoDB Connection String)

# AWS S3 Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET_NAME=...

# Clerk Authentication (if used in API for verification)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Run API Server

```sh
pnpm dev
# Runs on http://localhost:4001
```

---

## Running the Entire Repo

You can run both apps simultaneously from the root:

```sh
pnpm dev
```

---

## Architecture

## File Uploads

File uploads are handled efficiently using **AWS S3 Presigned URLs**. This allows the client to upload files directly to S3 without passing through the backend server, reducing load and improving performance for large files.

## Deployment

Both the Web and API applications are deployed on Vercel:

- **Web App**: [https://cloudly-web.vercel.app/](https://cloudly-web.vercel.app/)
- **API Server**: [https://cloudly-api.vercel.app/](https://cloudly-api.vercel.app/)

