# Panconvince CMS - Enterprise Platform

Modern CMS and Operational Management System for Panconvince, migrated from legacy Laravel to a state-of-the-art NestJS/React tech stack.

## 🏗 High-Level Architecture

This project is a monorepo-style structure containing both backend and frontend applications:

- **/backend**: NestJS API with Prisma ORM and PostgreSQL.
- **/frontend**: React (Vite) with TailwindCSS, Shadcn/UI, and TanStack Query.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- pnpm (recommended) or npm

### Setup Steps

1. **Clone & Setup Environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env # Configure your DB credentials
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Database Initialization**
   ```bash
   cd backend
   npx prisma generate    # Generate Prisma Client
   npx prisma migrate dev # Create standard tables
   npx prisma db seed     # Seed roles, permissions, and master data (including CSV)
   ```

### 🔐 Default Credentials (First Login)

Use these credentials to access the system after seeding:
- **Username**: `admin@pcmi.com`
- **Password**: `admin123`
- **Role**: Super Admin

> [!TIP]
> **Pro-Tip**: Use `npx prisma migrate reset` if you want to wipe the database and start fresh with all current master data from the latest seeder scripts.

3. **Running the Apps**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run start:dev

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

## 📂 Project Structure

```text
cms/
├── backend/            # NestJS Application
│   ├── prisma/         # Schema & Migrations
│   └── src/            # Application Logic
└── frontend/           # React Application
    ├── src/
    │   ├── features/   # Feature-grouped modules (Customers, Suppliers, etc.)
    │   └── components/ # Shared UI components
    └── public/
```

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | NestJS, Prisma, PostgreSQL, RxJS |
| **Frontend** | React, Vite, TailwindCSS, Shadcn/UI |
| **State Management** | TanStack Query (Query/Mutation), Zustand |
| **Authentication** | JWT, Passport.js, Permissions-based RBAC |
| **Branding** | Midnight Blue & Gold Premium Theme |

---

## 💎 Branding & Design

This platform uses a custom **Midnight Blue & Gold** premium theme. 
- **Primary Color**: Midnight Blue (Professional & Corporate)
- **Accent Color**: Gold (High-contrast for actions and branding)

Design tokens are managed in `frontend/src/index.css` using Tailwind CSS v4 variables.

---
