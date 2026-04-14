# Implementation Plan: Enterprise CMS Migration (Principal Level)

As an expert architect, I am designing this recreation to be modular, type-safe, and highly maintainable. We will use a **Clean Architecture** approach influenced by **Domain-Driven Design (DDD)** concepts, ensuring that the core business logic is decouple from infrastructure details.

## User Review Required

> [!IMPORTANT]
> **Database Host:** I will use the credentials provided: User: `appuser`, Password: `123456`. I will assume the host is `localhost` and the port is `5432`.
> **Naming Convention:** We will use `snake_case` for the database columns using Prisma's mapping directives (`@map` and `@@map`).

> [!NOTE]
> **Prisma vs Annotations:** Prisma does not use TypeScript decorators (like `@Column()`) in the src code. Instead, it uses a centralized **Schema File** (`schema.prisma`). This is a "battle-tested" advantage as it provides a single source of truth for both the database and your TypeScript types, making refactoring much safer.

## Proposed Changes

### 1. Workspace Organization
We will follow a clear separation of concerns with a monorepo-ready layout:
- `backend/`: NestJS + Prisma + PostgreSQL (The "Source of Truth" and Business Logic).
- `frontend/`: React + Vite + Tailwind + Shadcn (The "Presentation Layer").

---

### 2. Backend Architecture (NestJS Expert Setup)

#### [NEW] [backend/](file:///d:/New%20folder%20%282%29/new-cms/backend)
- **Modular Design**: Each feature (e.g., `proposals`) will be its own module containing its controller, service, DTOs, and entities.
- **Persistence Layer**: **Prisma ORM**. We will use Prisma's type-safety to its fullest, including middleware for soft-deletes as required by the legacy schema.
- **Complex Logic Handling**:
  - `PricingStrategy`: An interface implemented by `ModelAStrategy`, `ModelBStrategy`, etc.
  - `InvoiceFactory`: To handle the two distinct invoice flows (FIT vs Regular) elegantly.
- **Global Infrastructure**:
  - **Exception Filter**: Unified error response format `{ statusCode, message, timestamp, path }`.
  - **Logging**: Dedicated logger service for audit trails.
  - **RBAC**: A robust `PermissionGuard` that maps route decorators to user capabilities.

---

### 3. Frontend Architecture (React Expert Setup)

#### [NEW] [frontend/](file:///d:/New%20folder%20%282%29/new-cms/frontend)
- **Feature-Based Structure**: Instead of flat `components/`/`hooks/`, we use:
  - `src/features/[feature-name]`: Contains components, hooks, and types specific to that domain.
  - `src/components/ui`: Shared primitive components (Shadcn).
- **State Management Ecosystem**:
  - **TanStack Query (React Query)**: For all server-state (caching, loading, syncing).
  - **Zustand**: For lightweight client-state (Sidebar state, current Auth user).
- **Form Management**: **React Hook Form** + **Zod**. This provides compile-time and runtime validation.
- **Enterprise UI**: A "Zero-Reflow" Sidebar and breadcrumb system for premium UX.

---

### 4. Database & Infrastructure
- [NEW] `docker-compose.yml`: For easy local deployment of PostgreSQL and potentially Redis for caching.
- `prisma/schema.prisma`: Re-implementing the 29+ tables with modern types, proper indices, and FK constraints.

## Open Questions

1. **Prisma vs TypeORM:** While the doc recommended Prisma, as a Principal Architect, I strongly advocate for **Prisma** for this scale. Do you agree?
2. **Naming Convention:** Do you prefer `snake_case` or `camelCase` for the database columns in PostgreSQL? (PostgreSQL usually leans towards `snake_case`).

## Verification Plan

### Automated Testing Strategy
- **Unit Tests**: Using Jest for the Strategy patterns and math logic.
- **E2E Tests**: Basic Playwright/Cypress flow for the critical "Invoice Generation" path using `pnpm`.

### Manual Verification
- Swagger UI (OpenAPI) audit to ensure API consistency.
- Responsive UI testing across multiple viewport sizes.
