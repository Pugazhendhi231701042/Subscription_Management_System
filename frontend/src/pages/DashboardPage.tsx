import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Repeat,
  Zap,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Building2,
  Calendar
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string, param?: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [billingRunning, setBillingRunning] = useState<boolean>(false);
  const [billingResult, setBillingResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardMetrics();
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunBilling() {
    setBillingRunning(true);
    setBillingResult(null);
    try {
      const res = await api.runBillingCycle({ autoConfirm: true });
      setBillingResult(res);
      await loadDashboard(); // refresh stats
    } catch (err: any) {
      alert(`Error running billing: ${err.message}`);
    } finally {
      setBillingRunning(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#714B67]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-bold">Error Loading Dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={loadDashboard} className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const kpi = data?.kpi;
  const performance = data?.performance;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Finance & Operations Dashboard</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Zap className="w-3 h-3 mr-1" /> Real-time
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Executive control panel for recurring revenue, subscriber lifecycle, and automated billing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Query Response SLA Badge */}
          {performance && (
            <div className="hidden lg:flex flex-col text-right pr-3 border-r border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Query Latency</span>
              <span className="text-xs font-mono font-bold text-emerald-600 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {performance.queryDurationMs} ms (&lt; 2.0s SLA)
              </span>
            </div>
          )}

          {/* Trigger Recurring Billing Runner */}
          <button
            onClick={handleRunBilling}
            disabled={billingRunning}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 text-amber-300 ${billingRunning ? 'animate-bounce' : ''}`} />
            <span>{billingRunning ? 'Running Billing Engine...' : 'Run Billing Day Now'}</span>
          </button>
        </div>
      </div>

      {/* Billing Result Banner */}
      {billingResult && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-purple-700" />
            <div>
              <div className="text-sm font-bold text-purple-900">{billingResult.message}</div>
              <div className="text-xs text-purple-700">
                Invoiced: ₹{billingResult.totalInvoiced?.toLocaleString('en-IN')} across {billingResult.generatedCount} accounts. Duplicate prevention skipped {billingResult.skippedCount} accounts.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('invoices')}
            className="text-xs font-bold text-[#714B67] hover:underline"
          >
            View Invoices →
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Subscriptions</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {kpi?.activeSubscriptionsCount || 0}
          </div>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <span>Out of <strong className="text-slate-700">{kpi?.totalSubscriptionsCount || 0}</strong> total accounts</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recurring Revenue (MRR)</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            ₹{kpi?.mrr?.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <span>Projected ARR: <strong className="text-slate-700">₹{kpi?.arr?.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            ₹{kpi?.totalRevenueCollected?.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center text-xs text-emerald-600 mt-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reconciled Payments
          </div>
        </div>

        {/* Outstanding Receivables & Overdue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Receivables</span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            ₹{kpi?.totalOutstandingDue?.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center text-xs text-rose-500 mt-1 font-medium">
            <span>{kpi?.overdueInvoicesCount || 0} overdue invoices</span>
          </div>
        </div>

      </div>

      {/* Subscription Lifecycle Distribution */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center">
          <Repeat className="w-4 h-4 mr-2 text-[#714B67]" />
          Subscription State Distribution (Problem Statement Lifecycle)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {Object.entries(data?.statusDistribution || {}).map(([status, count]) => {
            let color = 'bg-slate-50 text-slate-700 border-slate-200';
            if (status === 'ACTIVE') color = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
            if (status === 'CONFIRMED') color = 'bg-blue-50 text-blue-700 border-blue-200';
            if (status === 'QUOTATION') color = 'bg-purple-50 text-purple-700 border-purple-200';
            if (status === 'PAUSED') color = 'bg-amber-50 text-amber-700 border-amber-200';
            if (status === 'CLOSED') color = 'bg-slate-100 text-slate-500 border-slate-300';

            return (
              <div key={status} className={`p-3 rounded-lg border text-center ${color}`}>
                <div className="text-xs uppercase tracking-wider">{status}</div>
                <div className="text-xl font-bold mt-1">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aging Overdue Invoices Alert Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Overdue Invoices Requiring Follow-up</h3>
          </div>
          <button
            onClick={() => onNavigate('invoices', 'overdue')}
            className="text-xs font-semibold text-[#714B67] hover:underline"
          >
            View All Invoices →
          </button>
        </div>

        {(!data?.overdueList || data.overdueList.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            🎉 All accounts are up-to-date! No overdue invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Subscription</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Days Overdue</th>
                  <th className="py-3 px-4 font-semibold">Amount Due</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.overdueList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#714B67]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{inv.companyName}</div>
                      <div className="text-xs text-slate-400">{inv.contactName} ({inv.email})</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {inv.subscriptionNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                        {inv.daysOverdue} days late
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600">
                      ₹{inv.amountDue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate('invoices')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
