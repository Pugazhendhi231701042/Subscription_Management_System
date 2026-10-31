import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Repeat,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [portalData, setPortalData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPortal();
  }, []);

  async function loadPortal() {
    setLoading(true);
    try {
      const res = await api.getPortalData();
      if (res.success) {
        setPortalData(res);
      }
    } catch (err: any) {
      console.error('Portal load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Customer Self-Service Portal...</div>;
  }

  const profile = portalData?.profile;
  const summary = portalData?.summary;
  const subscriptions = portalData?.subscriptions || [];
  const invoices = portalData?.invoices || [];
  const payments = portalData?.payments || [];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#714B67] to-[#4c2f44] text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">
            Customer Self-Service Portal
          </span>
          <h1 className="text-2xl font-black mt-1">{profile?.companyName}</h1>
          <p className="text-xs text-purple-200 mt-1">
            Contact: {profile?.contactName} • {profile?.email} • {profile?.city}, {profile?.country}
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-right">
          <div className="text-[11px] uppercase tracking-wider text-purple-200">Current Outstanding Due</div>
          <div className="text-2xl font-black text-amber-300 mt-0.5">
            ₹{summary?.totalOutstanding?.toLocaleString('en-IN') || '0'}
          </div>
        </div>
      </div>

      {/* Active Subscriptions Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center">
          <Repeat className="w-5 h-5 mr-2 text-[#714B67]" />
          My Subscriptions ({subscriptions.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.map((sub: any) => (
            <div key={sub.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-[#714B67]">{sub.subscriptionNumber}</span>
                  <h4 className="font-bold text-slate-800 text-sm mt-0.5">{sub.plan?.name}</h4>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {sub.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Cycle</span>
                  <span className="font-semibold text-slate-700">{sub.plan?.billingFrequency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Billing</span>
                  <span className="font-bold text-purple-800">
                    {new Date(sub.nextBillingDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Rate</span>
                  <span className="font-extrabold text-slate-900">₹{sub.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
                  <span className="font-semibold text-slate-700">{sub.paymentTerms}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices & Statements Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center">
          <Receipt className="w-5 h-5 mr-2 text-teal-600" />
          My Billing Invoices & Receipts
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Issue Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Balance Due</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#714B67]">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 font-bold">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-bold text-rose-600">
                    {inv.amountDue > 0 ? `₹${inv.amountDue.toLocaleString('en-IN')}` : 'Settled (₹0)'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
