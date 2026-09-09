import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
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
import BankMutationPage from './features/finance/pages/BankMutationPage';
import AccountPayablePage from './features/finance/pages/AccountPayablePage';
import AccountReceivablePage from './features/finance/pages/AccountReceivablePage';
import PpnInOutPage from './features/finance/pages/PpnInOutPage';
import DepreciationPage from './features/finance/pages/DepreciationPage';
import SalesPage from './features/sales/pages/SalesPage';
import InterAccountPage from './features/finance/pages/InterAccountPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import ProposalsPage from './features/proposals/pages/ProposalsPage';
import InvoicesPage from './features/invoices/pages/InvoicesPage';
import ReceiveVouchersPage from './features/vouchers/pages/ReceiveVouchersPage';
import PaymentVouchersPage from './features/vouchers/pages/PaymentVouchersPage';
import RolesPage from './features/access-control/pages/RolesPage';
import PermissionsPage from './features/access-control/pages/PermissionsPage';
import MenusPage from './features/access-control/pages/MenusPage';

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
            <Route path="finance-reports" element={<FinancePage />} />
            <Route path="bank-mutation" element={<BankMutationPage />} />
            <Route path="account-payable" element={<AccountPayablePage />} />
            <Route path="account-receivable" element={<AccountReceivablePage />} />
            <Route path="depreciation" element={<DepreciationPage />} />
            <Route path="ppn-in-out" element={<PpnInOutPage />} />
            <Route path="inter-account" element={<InterAccountPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="proposals" element={<ProposalsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="receive-vouchers" element={<ReceiveVouchersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="menus" element={<MenusPage />} />
            <Route path="payment-vouchers" element={<PaymentVouchersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
