import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Package,
  Percent,
  Users,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  // Customer Navigation
  if (role === 'CUSTOMER') {
    const customerLinks = [
      { id: 'portal', label: 'Customer Portal', icon: LayoutDashboard },
      { id: 'subscriptions', label: 'My Subscriptions', icon: Repeat },
      { id: 'invoices', label: 'My Invoices', icon: Receipt },
      { id: 'payments', label: 'Payment History', icon: CreditCard }
    ];

    return (
      <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)] flex flex-col p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">
          Self-Service Portal
        </div>
        <nav className="space-y-1">
          {customerLinks.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#714B67]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  // Admin and Staff Navigation
  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)] flex flex-col p-4 shadow-sm">
      
      {/* Sales & Lifecycle */}
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
        Sales & Subscriptions
      </div>
      <nav className="space-y-1 mb-6">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#714B67]" />
          <span>Finance Dashboard</span>
        </button>

        <button
          onClick={() => onTabChange('quotations')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'quotations'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Quotations</span>
        </button>

        <button
          onClick={() => onTabChange('subscriptions')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'subscriptions'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Repeat className="w-4 h-4 text-emerald-600" />
          <span>Subscriptions</span>
        </button>

        <button
          onClick={() => onTabChange('customers')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'customers'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-slate-500" />
          <span>Customers</span>
        </button>
      </nav>

      {/* Invoicing & Money */}
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
        Invoicing & Billing
      </div>
      <nav className="space-y-1 mb-6">
        <button
          onClick={() => onTabChange('invoices')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'invoices'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-teal-600" />
          <span>Invoices</span>
        </button>

        <button
          onClick={() => onTabChange('payments')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span>Payments Ledger</span>
        </button>
      </nav>

      {/* Catalog & Configuration (Admin Only) */}
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
        Catalog & Config
      </div>
      <nav className="space-y-1">
        <button
          onClick={() => onTabChange('catalog')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'catalog'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4 text-amber-600" />
          <span>Products & Plans</span>
        </button>

        <button
          onClick={() => onTabChange('discounts')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'discounts'
              ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4 text-rose-500" />
          <span>Discounts & Taxes</span>
        </button>

        {role === 'ADMIN' && (
          <>
            <button
              onClick={() => onTabChange('staff')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Manage Staff</span>
            </button>

            <button
              onClick={() => onTabChange('audit')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'bg-purple-50 text-[#714B67] font-semibold border-l-4 border-[#714B67]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Audit Trail</span>
            </button>
          </>
        )}
      </nav>

      {/* Bottom Footer Info */}
      <div className="mt-auto pt-4 border-t border-slate-100 text-[11px] text-slate-400">
        <div>Brightloop ERP v2.4</div>
        <div className="text-emerald-600 font-medium">● Local Database Connected</div>
      </div>
    </aside>
  );
};
