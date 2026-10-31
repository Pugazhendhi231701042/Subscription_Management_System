import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Subscription } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusbarPipeline } from '../components/StatusbarPipeline';
import {
  Repeat,
  Search,
  Filter,
  Eye,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  CheckCircle,
  Calendar,
  Building2,
  FileText
} from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter]);

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await api.listSubscriptions(params.toString());
      if (res.success) {
        setSubscriptions(res.data);
      }
    } catch (err: any) {
      alert(`Error loading subscriptions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusAction(id: string, action: string) {
    if (!confirm(`Are you sure you want to ${action} this subscription?`)) return;
    setActionLoading(true);
    try {
      const res = await api.updateSubscriptionStatus(id, action);
      if (res.success) {
        alert(res.message);
        await loadSubscriptions();
        if (selectedSub?.id === id) {
          setSelectedSub(res.data);
        }
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  const stages = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Repeat className="w-6 h-6 mr-2 text-[#714B67]" />
            Customer Subscriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete lifecycle management: Draft ➔ Quotation ➔ Confirmed ➔ Active ➔ Closed.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['', 'ACTIVE', 'CONFIRMED', 'PAUSED', 'CLOSED', 'DRAFT'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-[#714B67] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by subscription # (SUB-2026-...), company name, or contact person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadSubscriptions()}
          className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          onClick={loadSubscriptions}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
        >
          Search
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No subscriptions found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Subscription #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Plan</th>
                  <th className="py-3 px-4 font-semibold">Next Billing</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => {
                  let badge = 'bg-slate-100 text-slate-700';
                  if (sub.status === 'ACTIVE') badge = 'bg-emerald-100 text-emerald-800 font-bold';
                  if (sub.status === 'CONFIRMED') badge = 'bg-blue-100 text-blue-800';
                  if (sub.status === 'PAUSED') badge = 'bg-amber-100 text-amber-800';
                  if (sub.status === 'CLOSED') badge = 'bg-slate-200 text-slate-600';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#714B67]">
                        {sub.subscriptionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{sub.customer?.companyName}</div>
                        <div className="text-xs text-slate-400">{sub.customer?.contactName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{sub.plan?.name}</div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {sub.plan?.billingFrequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{sub.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#714B67] rounded-lg text-xs font-semibold inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>View Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Subscription Modal / View */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription Document</span>
                <h2 className="text-2xl font-extrabold text-slate-900 font-mono">
                  {selectedSub.subscriptionNumber}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  Customer: <strong className="text-slate-800">{selectedSub.customer?.companyName}</strong> ({selectedSub.customer?.email})
                </div>
              </div>

              {/* Odoo Pipeline Ribbon */}
              <div className="flex items-center space-x-4">
                <StatusbarPipeline
                  stages={stages}
                  currentStatus={selectedSub.status}
                />
                <button
                  onClick={() => setSelectedSub(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Lifecycle Action Buttons Bar */}
            {user?.role !== 'CUSTOMER' && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase mr-2">Lifecycle Actions:</span>
                
                {selectedSub.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusAction(selectedSub.id, 'CONFIRM')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                  </button>
                )}

                {(selectedSub.status === 'CONFIRMED' || selectedSub.status === 'DRAFT') && (
                  <button
                    onClick={() => handleStatusAction(selectedSub.id, 'ACTIVATE')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Activate
                  </button>
                )}

                {selectedSub.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusAction(selectedSub.id, 'PAUSE')}
                    disabled={actionLoading || !selectedSub.allowPause}
                    title={!selectedSub.allowPause ? 'Plan does not permit pause' : ''}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold flex items-center disabled:opacity-50"
                  >
                    <Pause className="w-3.5 h-3.5 mr-1" /> Pause Subscription
                  </button>
                )}

                {selectedSub.status === 'PAUSED' && (
                  <button
                    onClick={() => handleStatusAction(selectedSub.id, 'RESUME')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Resume Active
                  </button>
                )}

                {selectedSub.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusAction(selectedSub.id, 'CLOSE')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Close Subscription
                  </button>
                )}

                {selectedSub.status === 'CLOSED' && (
                  <button
                    onClick={() => handleStatusAction(selectedSub.id, 'RENEW')}
                    disabled={actionLoading || !selectedSub.allowRenewal}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Renew Contract
                  </button>
                )}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/60 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-bold">Plan</span>
                <span className="font-semibold text-slate-800 text-sm">{selectedSub.plan?.name}</span>
                <span className="text-slate-500 block">Billed {selectedSub.plan?.billingFrequency}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold">Start Date</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {new Date(selectedSub.startDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold">Next Billing Day</span>
                <span className="font-bold text-[#714B67] text-sm">
                  {new Date(selectedSub.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold">Expiry Date</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {selectedSub.expiryDate ? new Date(selectedSub.expiryDate).toLocaleDateString() : 'Auto-renewing'}
                </span>
              </div>
            </div>

            {/* Product Lines Table */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">Product & Service Lines</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Variant / Edition</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Tax Rate</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSub.lines?.map((line, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{line.product?.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{line.variant?.variantName || 'Standard'}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{line.quantity}</td>
                        <td className="py-2.5 px-3 text-right">₹{line.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right">{line.taxRate}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{line.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Untaxed Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{selectedSub.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Taxes (GST 18%):</span>
                  <span className="font-semibold text-slate-800">₹{selectedSub.taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm font-bold text-[#714B67]">
                  <span>Total Recurring Rate:</span>
                  <span>₹{selectedSub.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Close Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
