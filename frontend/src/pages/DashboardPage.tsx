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
  Calendar,
  Download,
  Play,
  Eye,
  Sliders
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string, param?: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [billingRunning, setBillingRunning] = useState<boolean>(false);
  const [billingResult, setBillingResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulation Controls
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simDate, setSimDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simPreview, setSimPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

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

  async function handleRunBilling(customDate?: string) {
    setBillingRunning(true);
    setBillingResult(null);
    try {
      const payload: any = { autoConfirm: true };
      if (customDate) payload.targetDate = new Date(customDate).toISOString();

      const res = await api.runBillingCycle(payload);
      setBillingResult(res);
      setShowSimModal(false);
      await loadDashboard(); // refresh stats
    } catch (err: any) {
      alert(`Error running billing: ${err.message}`);
    } finally {
      setBillingRunning(false);
    }
  }

  async function handlePreviewSimDate() {
    setPreviewLoading(true);
    try {
      const res = await api.previewDueBilling();
      if (res.success) {
        setSimPreview(res);
      }
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  }

  function exportFinancialReportCSV() {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Active Subscriptions', data.kpi.activeSubscriptionsCount],
      ['Total Subscriptions', data.kpi.totalSubscriptionsCount],
      ['Monthly Recurring Revenue (MRR)', `₹${data.kpi.mrr}`],
      ['Annual Recurring Revenue (ARR)', `₹${data.kpi.arr}`],
      ['Total Collected Revenue', `₹${data.kpi.totalRevenueCollected}`],
      ['Outstanding Receivables', `₹${data.kpi.totalOutstandingDue}`],
      ['Overdue Invoices Count', data.kpi.overdueInvoicesCount],
      ['Overdue Amount', `₹${data.kpi.overdueTotalAmount}`],
      ['Report Generated Date', new Date().toISOString()]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Brightloop_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Visual Chart Data calculation
  const totalSubs = (kpi?.totalSubscriptionsCount || 1);
  const activeSubs = (kpi?.activeSubscriptionsCount || 0);
  const activePct = Math.round((activeSubs / totalSubs) * 100);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
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
              <span className="text-[10px] uppercase font-bold text-slate-400">Database SLA</span>
              <span className="text-xs font-mono font-bold text-emerald-600 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {performance.queryDurationMs} ms (&lt; 2.0s SLA)
              </span>
            </div>
          )}

          {/* Export to CSV */}
          <button
            onClick={exportFinancialReportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Simulate Billing Button */}
          <button
            onClick={() => setShowSimModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate Cycle</span>
          </button>

          {/* Trigger Recurring Billing Runner */}
          <button
            onClick={() => handleRunBilling()}
            disabled={billingRunning}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-300 ${billingRunning ? 'animate-bounce' : ''}`} />
            <span>{billingRunning ? 'Running Billing Engine...' : 'Run Billing Day Now'}</span>
          </button>
        </div>
      </div>

      {/* Billing Result Banner */}
      {billingResult && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-purple-700 flex-shrink-0" />
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

      {/* Interactive Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Performance & Trajectory Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recurring Revenue & Collections Breakdown
              </h3>
              <p className="text-xs text-slate-400">Dynamic ledger visualization from local database</p>
            </div>
            <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              MRR: ₹{kpi?.mrr?.toLocaleString('en-IN')}
            </span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="pt-4">
            <div className="space-y-3">
              {/* Collected Revenue Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Collected Revenue (Settled Payments)</span>
                  <span className="font-bold text-emerald-700">₹{kpi?.totalRevenueCollected?.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round(((kpi?.totalRevenueCollected || 0) / ((kpi?.totalRevenueCollected || 0) + (kpi?.totalOutstandingDue || 1))) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Outstanding Receivables Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Outstanding Receivables (Due Invoices)</span>
                  <span className="font-bold text-amber-700">₹{kpi?.totalOutstandingDue?.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round(((kpi?.totalOutstandingDue || 0) / ((kpi?.totalRevenueCollected || 0) + (kpi?.totalOutstandingDue || 1))) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Overdue Aging Risk Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Aging Overdue Risk (&gt;30 Days)</span>
                  <span className="font-bold text-rose-700">₹{kpi?.overdueTotalAmount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round(((kpi?.overdueTotalAmount || 0) / ((kpi?.totalOutstandingDue || 1))) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs text-slate-500 border border-slate-100">
            <span>Projected Annual Run-Rate (ARR):</span>
            <span className="font-bold text-slate-900 text-sm">₹{kpi?.arr?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Subscription Funnel & Health Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Subscriber Health & Funnel
              </h3>
              <p className="text-xs text-slate-400">Draft ➔ Quotation ➔ Confirmed ➔ Active ➔ Closed</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {activePct}% Retention
            </span>
          </div>

          {/* Visual State Funnel */}
          <div className="space-y-2.5 pt-2">
            {Object.entries(data?.statusDistribution || {}).map(([st, cnt]) => {
              const pct = totalSubs > 0 ? Math.round((cnt / totalSubs) * 100) : 0;
              let barColor = 'bg-slate-400';
              if (st === 'ACTIVE') barColor = 'bg-emerald-500';
              if (st === 'CONFIRMED') barColor = 'bg-blue-500';
              if (st === 'QUOTATION') barColor = 'bg-purple-500';
              if (st === 'PAUSED') barColor = 'bg-amber-500';
              if (st === 'CLOSED') barColor = 'bg-slate-500';

              return (
                <div key={st}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600">{st}</span>
                    <span className="font-bold text-slate-800">{cnt} accounts ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(5, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs text-slate-500 border border-slate-100">
            <span>Active Contract Coverage:</span>
            <span className="font-bold text-emerald-700">{kpi?.activeSubscriptionsCount} Live Contracts</span>
          </div>
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

      {/* Date Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Simulate Recurring Billing Cycle</h3>
                <p className="text-xs text-slate-500">Pick any future calendar date to test automated cycle execution</p>
              </div>
              <button onClick={() => setShowSimModal(false)}>✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Target Billing Date</label>
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none font-bold text-teal-800"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSimDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-[11px]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setSimDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-[11px]"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + 1);
                    setSimDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-[11px]"
                >
                  +1 Month
                </button>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="font-bold text-[#714B67] block mb-1">Idempotency & Duplicate Prevention Guarantee:</span>
                <p className="text-slate-600">
                  The billing engine evaluates subscriptions whose <code>nextBillingDate &lt;= targetDate</code>. If an invoice for this period already exists, it is automatically skipped.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={billingRunning}
                  onClick={() => handleRunBilling(simDate)}
                  className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5b3b52] text-white font-bold rounded shadow-sm flex items-center"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  <span>{billingRunning ? 'Executing Cycle...' : 'Execute Simulation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
