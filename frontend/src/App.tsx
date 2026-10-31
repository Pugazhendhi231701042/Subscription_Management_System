import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CatalogPage } from './pages/CatalogPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { StaffPage } from './pages/StaffPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [initialParam, setInitialParam] = useState<string | undefined>(undefined);

  function handleNavigate(tab: string, param?: string) {
    setActiveTab(tab);
    setInitialParam(param);
  }

  // If not logged in, show login page
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Navbar activeTab={activeTab} onTabChange={handleNavigate} />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} onTabChange={handleNavigate} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {activeTab === 'subscriptions' && <SubscriptionsPage />}
          {activeTab === 'quotations' && <QuotationsPage />}
          {activeTab === 'invoices' && <InvoicesPage initialFilter={initialParam} />}
          {activeTab === 'payments' && <PaymentsPage />}
          {activeTab === 'catalog' && <CatalogPage />}
          {activeTab === 'discounts' && <DiscountsPage />}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'portal' && <CustomerPortalPage />}
          {activeTab === 'staff' && <StaffPage />}
          {activeTab === 'audit' && <AuditLogsPage />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
