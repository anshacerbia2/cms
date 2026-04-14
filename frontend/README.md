# Rekayasa CMS - Frontend (React + Vite)

A premium, high-fidelity dashboard built for Rekayasa Industri using modern React patterns.

## 🛠 Tech Stack
- **React 18**: Frontend library.
- **Vite**: Fast development server and build tool.
- **TailwindCSS**: Utility-first styling with "Premium Glassmorphism" aesthetics.
- **Shadcn/UI**: High-quality UI components based on Radix UI.
- **TanStack Query (React Query)**: Global state and async data orchestration.
- **Zustand**: Lightweight client-side state management (Auth, Sidebar).

## 🚀 Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the `frontend/` root:
   ```env
   VITE_API_URL="http://localhost:3000"
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📂 Feature Architecture

The project uses a **Feature-Based Structure**. Each major module (e.g., Customers, Suppliers) is isolated in `src/features/[feature-name]/`:

```text
feature/
├── components/   # Feature-specific UI (Dialogs, Card components)
├── hooks/        # TanStack Query custom hooks
├── pages/        # Main route components
└── types/        # TypeScript interfaces
```

## 💎 Design Standards

- **Premium Aesthetics**: Use `shadow-premium`, `bg-white/50`, and `backdrop-blur` for cards and dialogs.
- **Micro-interactions**: Every button and tab uses `active:scale-95` and `animate-in` transitions.
- **Upper-case Typography**: Professional headers and labels use `uppercase tracking-widest` font styles.
- **Custom Components**:
  - `AppSidebar`: Fluid, GPU-accelerated navigation.
  - `DataTable`: Premium tables with server-side pagination and skeleton loaders.

## 📡 Data Fetching (TanStack Query)

Avoid `useEffect` for data fetching. Use the custom hooks provided in each feature:

```typescript
const { suppliersQuery, createSupplier } = useSuppliers({ page: 1, search: "" });

if (suppliersQuery.isLoading) return <Skeleton />;
return <div>{suppliersQuery.data.data.map(...)}</div>;
```

---

For UI component references, check the **Shadcn/UI Documentation**.
