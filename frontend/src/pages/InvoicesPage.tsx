import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusbarPipeline } from '../components/StatusbarPipeline';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Send,
  Printer,
  XCircle,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Clock
} from 'lucide-react';

export const InvoicesPage: React.FC<{ initialFilter?: string }> = ({ initialFilter }) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || '');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('UPI');
  const [payRef, setPayRef] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('');
  const [paying, setPaying] = useState<boolean>(false);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter === 'overdue') {
        params.append('overdue', 'true');
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (search) params.append('search', search);

      const res = await api.listInvoices(params.toString());
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (err: any) {
      alert(`Error loading invoices: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id: string) {
    try {
      const res = await api.confirmInvoice(id);
      if (res.success) {
        alert(res.message);
        await loadInvoices();
        if (selectedInvoice?.id === id) setSelectedInvoice(res.data);
      }
    } catch (err: any) {
      alert(`Failed to confirm: ${err.message}`);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      const res = await api.cancelInvoice(id);
      if (res.success) {
        alert(res.message);
        await loadInvoices();
        if (selectedInvoice?.id === id) setSelectedInvoice(res.data);
      }
    } catch (err: any) {
      alert(`Failed to cancel: ${err.message}`);
    }
  }

  async function handleSend(id: string) {
    try {
      const res = await api.sendInvoice(id);
      if (res.success) {
        alert(res.message);
        await loadInvoices();
        if (selectedInvoice?.id === id) setSelectedInvoice(res.data);
      }
    } catch (err: any) {
      alert(`Failed to send: ${err.message}`);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaying(true);
    try {
      const res = await api.recordPayment({
        invoiceId: selectedInvoice.id,
        amount: payAmount,
        paymentMethod: payMethod,
        referenceNumber: payRef,
        notes: payNote
      });

      if (res.success) {
        alert(res.message);
        setShowPaymentModal(false);
        await loadInvoices();
        // reload current invoice detail
        const updatedInv = await api.getInvoice(selectedInvoice.id);
        if (updatedInv.success) setSelectedInvoice(updatedInv.data);
      }
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setPaying(false);
    }
  }

  function openPayment(inv: Invoice) {
    setSelectedInvoice(inv);
    setPayAmount(inv.amountDue);
    setPayRef(`TXN/${Date.now().toString().slice(-6)}`);
    setPayNote('');
    setShowPaymentModal(true);
  }

  const stages = ['DRAFT', 'CONFIRMED', 'PAID'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Receipt className="w-6 h-6 mr-2 text-[#714B67]" />
            Recurring Invoices & Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated billing ledger with instant payment reconciliation, tax rules, and PDF preview.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: '', label: 'ALL' },
            { id: 'CONFIRMED', label: 'CONFIRMED' },
            { id: 'PAID', label: 'PAID' },
            { id: 'overdue', label: 'OVERDUE' },
            { id: 'DRAFT', label: 'DRAFT' },
            { id: 'CANCELLED', label: 'CANCELLED' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === t.id
                  ? 'bg-[#714B67] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by invoice # (INV-2026-...), customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
          className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          onClick={loadInvoices}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
        >
          Search
        </button>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Billing Period</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Due / Balance</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  let badge = 'bg-slate-100 text-slate-700';
                  if (inv.status === 'PAID') badge = 'bg-emerald-100 text-emerald-800 font-bold';
                  if (inv.status === 'CONFIRMED') badge = 'bg-blue-100 text-blue-800';
                  if (inv.status === 'OVERDUE') badge = 'bg-rose-100 text-rose-800 font-bold';
                  if (inv.status === 'CANCELLED') badge = 'bg-slate-200 text-slate-500 line-through';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#714B67]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{inv.customer?.companyName}</div>
                        <div className="text-xs text-slate-400">{inv.customer?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(inv.billingPeriodStart).toLocaleDateString()} – {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{inv.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {inv.amountDue > 0 ? (
                          <span className="text-rose-600">₹{inv.amountDue.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-600">₹0 (Settled)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                        >
                          View
                        </button>

                        {user?.role !== 'CUSTOMER' && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openPayment(inv)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold inline-flex items-center"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            <span>Pay</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Customer Invoice</span>
                <h2 className="text-2xl font-extrabold text-slate-900 font-mono">
                  {selectedInvoice.invoiceNumber}
                </h2>
                <div className="text-xs text-slate-500">
                  Customer: <strong>{selectedInvoice.customer?.companyName}</strong> ({selectedInvoice.customer?.contactName})
                </div>
              </div>

              {/* Statusbar pipeline */}
              <div className="flex items-center space-x-4">
                <StatusbarPipeline
                  stages={stages}
                  currentStatus={selectedInvoice.status}
                />
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedInvoice.status === 'DRAFT' && user?.role !== 'CUSTOMER' && (
                  <button
                    onClick={() => handleConfirm(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm Invoice
                  </button>
                )}

                {user?.role !== 'CUSTOMER' && (
                  <button
                    onClick={() => handleSend(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold flex items-center"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Send to Customer
                  </button>
                )}

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold flex items-center"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print / PDF View
                </button>

                {user?.role !== 'CUSTOMER' && selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleCancel(selectedInvoice.id)}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold flex items-center"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                  </button>
                )}
              </div>

              {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && user?.role !== 'CUSTOMER' && (
                <button
                  onClick={() => openPayment(selectedInvoice)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center"
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Record Payment
                </button>
              )}
            </div>

            {/* Invoices Line Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Tax Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map((line, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{line.description}</td>
                      <td className="py-2.5 px-3 text-right">{line.quantity}</td>
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

            {/* Financial Breakdown */}
            <div className="flex justify-between items-start pt-2">
              <div className="text-xs text-slate-500 max-w-sm">
                <div>Billing Period: <strong>{new Date(selectedInvoice.billingPeriodStart).toLocaleDateString()} to {new Date(selectedInvoice.billingPeriodEnd).toLocaleDateString()}</strong></div>
                <div>Due Date: <strong>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</strong></div>
                {selectedInvoice.notes && <div className="mt-1 italic text-slate-400">Note: {selectedInvoice.notes}</div>}
              </div>

              <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount Applied:</span>
                    <span>-₹{selectedInvoice.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxes (GST 18%):</span>
                  <span className="font-semibold">₹{selectedInvoice.taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sm text-[#714B67]">
                  <span>Total Amount:</span>
                  <span>₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Paid:</span>
                  <span>₹{selectedInvoice.amountPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-extrabold text-sm border-t border-slate-200 pt-1">
                  <span>Amount Due:</span>
                  <span>₹{selectedInvoice.amountDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Incoming Payment</h3>
                <p className="text-xs text-slate-500">Invoice {selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none font-medium"
                >
                  <option value="UPI">UPI / QR (Google Pay, PhonePe, Paytm)</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT / IMPS</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash Settlement</option>
                  <option value="OTHER">Other / Wire</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Amount Received (₹) * (Max: ₹{selectedInvoice.amountDue.toFixed(2)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.amountDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-bold p-2.5 border border-slate-200 rounded-lg outline-none text-[#714B67]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Transaction / Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/123456789 or UTR..."
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received via client direct deposit"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {paying ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Printable Invoice PDF Layout Modal */}
      {showPrintModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8 space-y-6 border border-slate-200">
            
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <div className="text-2xl font-black text-[#714B67] flex items-center space-x-2">
                  <span>Brightloop Software</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  12 Cloud Boulevard, Tech District<br />
                  Bangalore, Karnataka, 560001<br />
                  GSTIN: 29AAAAA0000A1Z5
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono text-slate-900">{selectedInvoice.invoiceNumber}</div>
                <div className="text-xs text-slate-500 mt-1">Date: {new Date(selectedInvoice.issueDate).toLocaleDateString()}</div>
                <div className="text-xs text-slate-500">Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-800">
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            {/* Bill To */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Billed To:</span>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedInvoice.customer?.companyName}</div>
              <div className="text-xs text-slate-500">{selectedInvoice.customer?.contactName}</div>
              <div className="text-xs text-slate-500">{selectedInvoice.customer?.email}</div>
              {selectedInvoice.customer?.taxNumber && (
                <div className="text-xs text-slate-400 font-mono mt-0.5">GST: {selectedInvoice.customer.taxNumber}</div>
              )}
            </div>

            {/* Lines */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{l.description}</td>
                      <td className="py-2 px-3 text-right">{l.quantity}</td>
                      <td className="py-2 px-3 text-right">₹{l.unitPrice}</td>
                      <td className="py-2 px-3 text-right">{l.taxRate}%</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">₹{l.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end pt-2 text-xs">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{selectedInvoice.subtotal}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>-₹{selectedInvoice.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax (GST 18%):</span>
                  <span>₹{selectedInvoice.taxAmount}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#714B67] border-t border-slate-200 pt-1">
                  <span>Total Amount:</span>
                  <span>₹{selectedInvoice.totalAmount}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                  <span>Amount Due:</span>
                  <span>₹{selectedInvoice.amountDue}</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-[#714B67] text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Print Document
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
