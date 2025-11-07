import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { PermissionsProvider } from '@/hooks/use-permissions';
import { Layout } from '@/components/layout/layout';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import ProtectedCustomersPage from '@/pages/customers';
import { ItemsPage } from '@/pages/items';
import { InvoicesPage } from '@/pages/invoices';
import { InvoiceWizardPage } from '@/pages/invoice-wizard';
import { ReportsPage } from '@/pages/reports';
import { SalesBookPage } from '@/pages/reports/sales-book';
import { IgtfReportPage } from '@/pages/reports/igtf-report';
import { IvaMensualPage } from '@/pages/reports/iva-monthly';
import { FiscalAnalysisPage } from '@/pages/reports/fiscal-analysis';
import SalesAnalysisPage from '@/pages/reports/sales-analysis';
import CustomerAnalysisPage from '@/pages/reports/customer-analysis';
import { CompanySettingsPage } from '@/pages/company-settings';
import UsersPage from '@/pages/users';
import QuotationsPage from '@/pages/quotations';
// FASE 8: Imports para multi-empresa
import { MultiCompanySettingsPage } from '@/pages/multi-company-settings';
import { MultiCompanyUsersPage } from '@/pages/multi-company-users';
import { BcvRatesPage } from '@/pages/bcv-rates';
import { TfhkaAuditPage } from '@/pages/tfhka-audit';
import DebugAuth from '@/components/debug/debug-auth';
import { DebitNoteTest } from '@/debug/debit-note-test';
import { SettingsPage } from '@/pages/settings';
// FASE 9: Import del dashboard de auditoría
import { AuditDashboardPage } from '@/pages/audit-dashboard';
// FASE 10: Imports para integración y documentación
import { WebhookManagementPage } from '@/pages/webhook-management';
import { ApiDocumentationPage } from '@/pages/api-documentation';
import { UserGuidesPage } from '@/pages/user-guides';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PermissionsProvider>
      {children}
    </PermissionsProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  useKeyboardShortcuts();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clientes" element={<ProtectedCustomersPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="cotizaciones" element={<QuotationsPage />} />
        <Route path="facturas" element={<InvoicesPage />} />
        <Route path="facturas/nueva" element={<InvoiceWizardPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="reportes/libro-ventas" element={<SalesBookPage />} />
        <Route path="reportes/igtf" element={<IgtfReportPage />} />
        <Route path="reportes/iva-mensual" element={<IvaMensualPage />} />
        <Route path="reportes/analisis-fiscal" element={<FiscalAnalysisPage />} />
        <Route path="reportes/analisis-ventas" element={<SalesAnalysisPage />} />
        <Route path="reportes/analisis-clientes" element={<CustomerAnalysisPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
        <Route path="configuracion/tasas-bcv" element={<BcvRatesPage />} />
        <Route path="auditoria/tfhka" element={<TfhkaAuditPage />} />
        {/* FASE 9: Ruta del dashboard de auditoría */}
        <Route path="auditoria/dashboard" element={<AuditDashboardPage />} />
        {/* FASE 10: Rutas para integración y documentación */}
        <Route path="integraciones/webhooks" element={<WebhookManagementPage />} />
        <Route path="integraciones/api-docs" element={<ApiDocumentationPage />} />
        <Route path="ayuda/guias" element={<UserGuidesPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        {/* FASE 8: Rutas para multi-empresa */}
        <Route path="multi-empresa" element={<MultiCompanySettingsPage />} />
        <Route path="multi-empresa/configuracion" element={<MultiCompanySettingsPage />} />
        <Route path="multi-empresa/usuarios" element={<MultiCompanyUsersPage />} />
        <Route path="debug/auth" element={<DebugAuth />} />
        <Route path="debug/debit-note" element={<DebitNoteTest />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            richColors 
            expand={false}
            duration={4000}
          />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;