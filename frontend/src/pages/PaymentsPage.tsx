import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Payment } from '../types';
import { CreditCard, Search, CheckCircle2, Building2, Calendar, FileText } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    try {
      const res = await api.listPayments();
      if (res.success) {
        setPayments(res.data);
      }
    } catch (err: any) {
      alert(`Error loading payments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const filtered = payments.filter(p =>
    p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.customer?.companyName.toLowerCase().includes(search.toLowerCase()) ||
    p.referenceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <CreditCard className="w-6 h-6 mr-2 text-[#714B67]" />
            Payment Reconciliation Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-method payments matched against recurring customer invoices.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase font-bold text-slate-400">Total Payments Recorded</div>
          <div className="text-xl font-extrabold text-emerald-600">
            ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search payments by payment #, customer name, or transaction ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none text-slate-800"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading payment records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No payment records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Payment #</th>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Method</th>
                  <th className="py-3 px-4 font-semibold">Payment Date</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#714B67]">
                      {p.paymentNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {p.invoice?.invoiceNumber || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{p.customer?.companyName}</div>
                      {p.notes && <div className="text-xs text-slate-400 italic">{p.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-50 text-blue-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {p.referenceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      ₹{p.amount.toLocaleString('en-IN')}
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
