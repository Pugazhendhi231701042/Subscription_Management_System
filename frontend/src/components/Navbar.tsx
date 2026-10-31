import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCheck, Building2, LogOut, Sparkles } from 'lucide-react';

export const Navbar: React.FC<{ activeTab: string; onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
  const { user, logout, quickSwitchRole } = useAuth();

  return (
    <header className="bg-[#714B67] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & App Name */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => onTabChange('dashboard')}
              className="flex items-center space-x-2 font-bold text-lg tracking-tight text-white hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-extrabold text-amber-300">
                🔄
              </div>
              <span>Brightloop<span className="font-light text-purple-200"> ERP</span></span>
            </button>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-400/20 text-amber-200 border border-amber-400/30">
              <Sparkles className="w-3 h-3 mr-1" /> Odoo Hackathon 2026
            </span>
          </div>

          {/* Quick Evaluator Role Switcher */}
          <div className="hidden sm:flex items-center bg-black/20 p-1 rounded-lg border border-white/10 space-x-1">
            <span className="text-xs text-purple-200 px-2 font-medium">Demo Role:</span>
            <button
              onClick={() => { quickSwitchRole('ADMIN'); onTabChange('dashboard'); }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                user?.role === 'ADMIN'
                  ? 'bg-amber-400 text-slate-900 shadow-sm'
                  : 'text-purple-100 hover:bg-white/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => { quickSwitchRole('STAFF'); onTabChange('quotations'); }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                user?.role === 'STAFF'
                  ? 'bg-teal-400 text-slate-900 shadow-sm'
                  : 'text-purple-100 hover:bg-white/10'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sales Staff</span>
            </button>
            <button
              onClick={() => { quickSwitchRole('CUSTOMER'); onTabChange('portal'); }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                user?.role === 'CUSTOMER'
                  ? 'bg-blue-400 text-slate-900 shadow-sm'
                  : 'text-purple-100 hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden lg:block">
              <div className="text-xs font-medium text-white">{user?.name}</div>
              <div className="text-[10px] text-purple-200">{user?.email} • <span className="font-bold text-amber-300">{user?.role}</span></div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs uppercase">
              {user?.name?.charAt(0) || 'U'}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
