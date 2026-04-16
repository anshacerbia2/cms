import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import DashboardLayout from './components/layout/DashboardLayout';
import CustomersPage from './features/customers/pages/CustomersPage';
import SuppliersPage from './features/suppliers/pages/SuppliersPage';
import ProductsPage from './features/products/pages/ProductsPage';
import BanksPage from './features/banks/pages/BanksPage';
import StaffPage from './features/staff/pages/StaffPage';
import FinancePage from './features/finance/pages/FinancePage';

const queryClient = new QueryClient();

// Protected Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Area */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="banks" element={<BanksPage />} />
            <Route path="users" element={<StaffPage />} />
            <Route path="finance" element={<FinancePage />} />
            {/* Add more routes here */}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
