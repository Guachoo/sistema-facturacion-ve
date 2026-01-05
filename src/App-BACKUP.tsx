import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Layout } from '@/components/layout/layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { CustomersPage } from '@/pages/customers';
import { ItemsPage } from '@/pages/items';
import { InvoicesPage } from '@/pages/invoices';
import { InvoiceWizardPage } from '@/pages/invoice-wizard';
import { ReportsPage } from '@/pages/reports';
import { SalesBookPage } from '@/pages/reports/sales-book';
import { IgtfReportPage } from '@/pages/reports/igtf-report';
import { CompanySettingsPage } from '@/pages/company-settings';
import { ConfiguracionPage } from '@/pages/configuracion';
import { UsuariosPage } from '@/pages/usuarios';

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
  
  return <>{children}</>;
}

function LocationLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log('🔄 Location changed to:', location.pathname);
  }, [location]);

  return null;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  useKeyboardShortcuts();

  console.log('AppRoutes rendering, isAuthenticated:', isAuthenticated, 'current path:', location.pathname);

  return (
    <>
      <LocationLogger />
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
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="facturas" element={<InvoicesPage />} />
        <Route path="facturas/nueva" element={<InvoiceWizardPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="reportes/libro-ventas" element={<SalesBookPage />} />
        <Route path="reportes/igtf" element={<IgtfReportPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
        <Route path="configuracion/empresa" element={<CompanySettingsPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />

        {/* Rutas protegidas - comentadas temporalmente para desarrollo
        <Route
          path="reportes"
          element={
            <ProtectedRoute permission="view_reports">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reportes/libro-ventas"
          element={
            <ProtectedRoute permission="view_reports">
              <SalesBookPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reportes/igtf"
          element={
            <ProtectedRoute permission="view_reports">
              <IgtfReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute permission="view_settings">
              <ConfiguracionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion/empresa"
          element={
            <ProtectedRoute permission="view_settings">
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute permission="manage_users">
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        */}
      </Route>
      {/* Catch-all for unmatched routes - redirects to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
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