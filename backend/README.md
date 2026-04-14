# Rekayasa CMS - Backend API (NestJS)

The backend provides a secure, type-safe RESTful API for the enterprise operational system.

## 🛠 Tech Stack
- **NestJS**: Enterprise-grade Node.js framework.
- **Prisma**: Type-safe ORM for PostgreSQL.
- **JWT & Passport**: Authentication and security.
- **Class Validator**: Robust DTO validation.

## 🚀 Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the `backend/` root:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/rekayasa_cms?schema=public"
   JWT_SECRET="your-secure-secret"
   JWT_EXPIRES_IN="1d"
   ```

3. **Prisma Initialization**
   Always run the generate command whenever you modify the schema:
   ```bash
   npx prisma generate    # Generates client to node_modules (Standard)
   npx prisma migrate dev # Runs incremental migrations (Safe for data)
   ```

4. **Database Reset**
   If the database structure is broken or you want to start fresh with seed data:
   ```bash
   npx prisma migrate reset # WIPES ALL DATA and re-runs the seed script
   ```

   > [!CAUTION]
   > Use `migrate reset` with caution as it will delete all manually entered data in the database.

5. **Data Seeding**
   To manually re-run the seed script (Idempotent):
   ```bash
   npx prisma db seed
   ```

6. **Start Development Server**
   ```bash
   npm run start:dev
   ```

## 🔐 Security Architecture (RBAC)

Access control is governed by a **Permissions Guard**. Every endpoint should be protected using:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('customers.index') // Specific permission route
@Get()
findAll() { ... }
```

> [!TIP]
> **Important**: Permissions are stored in the JWT payload. If you modify permissions in `seed.ts` and re-run the seeder, you **MUST** logout and login again in the frontend to receive a fresh token with the updated permission set.

Permissions and Roles are defined in `prisma/seed.ts` and stored in the database.

## 📁 Feature Modules

Current active modules:
- **Auth**: Login and identity management.
- **Customers**: Management of external clients and billing entities.
- **Suppliers**: Procurement provider registry with PIC management.
- **Products**: Technical equipment and service SKU catalog.
- **Banks**: Corporate bank accounts and institution master list.

## 📝 Coding Standards

- **DTOs**: Always use Data Transfer Objects with `class-validator` decorators.
- **Filtering**: Use the `AllExceptionsFilter` for standard JSON error responses.
- **Services**: Business logic belongs in Services, not Controllers.
- **BigInt Handling**: Since IDs use `BigInt`, ensure the `BigInt` interceptor is active for JSON serialization.

---

For architectural questions, consult the **Master Data Migration Walkthrough**.
