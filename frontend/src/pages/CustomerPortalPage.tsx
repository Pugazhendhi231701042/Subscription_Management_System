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
  ArrowRight,
  Edit3,
  Printer,
  ShieldCheck,
  QrCode
} from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [portalData, setPortalData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Pay Modal State
  const [payInvoice, setPayInvoice] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<string>('UPI');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Edit Profile State
  const [showEditProfile, setShowEditProfile] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [city, setCity] = useState<string>('');

  useEffect(() => {
    loadPortal();
  }, []);

  async function loadPortal() {
    setLoading(true);
    try {
      const res = await api.getPortalData();
      if (res.success) {
        setPortalData(res);
        if (res.profile) {
          setContactName(res.profile.contactName || '');
          setPhone(res.profile.phone || '');
          setStreet(res.profile.street || '');
          setCity(res.profile.city || '');
        }
      }
    } catch (err: any) {
      console.error('Portal load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePortalPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payInvoice) return;
    setIsProcessing(true);
    try {
      const res = await api.portalPayInvoice(payInvoice.id, {
        paymentMethod: payMethod,
        referenceNumber: `PORTAL/${payMethod}/${Date.now().toString().slice(-6)}`
      });

      if (res.success) {
        alert(res.message);
        setPayInvoice(null);
        await loadPortal();
      }
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.updatePortalProfile({
        contactName,
        phone,
        street,
        city
      });

      if (res.success) {
        alert(res.message);
        setShowEditProfile(false);
        await loadPortal();
      }
    } catch (err: any) {
      alert(`Profile update failed: ${err.message}`);
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
            Contact: {profile?.contactName} • {profile?.email} • {profile?.city || 'Bangalore'}, {profile?.country}
          </p>
          <button
            onClick={() => setShowEditProfile(true)}
            className="mt-3 inline-flex items-center space-x-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold text-white transition-colors"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            <span>Update Billing Address</span>
          </button>
        </div>

        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-right">
          <div className="text-[11px] uppercase tracking-wider text-purple-200">Current Outstanding Due</div>
          <div className="text-2xl font-black text-amber-300 mt-0.5">
            ₹{summary?.totalOutstanding?.toLocaleString('en-IN') || '0'}
          </div>
          <span className="text-[10px] text-purple-200 block mt-1">
            {subscriptions.length} Subscribed Services
          </span>
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
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Frequency</span>
                  <span className="font-semibold text-slate-700">{sub.plan?.billingFrequency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Billing Day</span>
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

      {/* Invoices & Statements Table with 1-Click Pay */}
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
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Balance Due</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Self-Service Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#714B67]">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(inv.billingPeriodStart).toLocaleDateString()} – {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                  </td>
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
                  <td className="py-2.5 px-3 text-right">
                    {inv.amountDue > 0 ? (
                      <button
                        onClick={() => setPayInvoice(inv)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm inline-flex items-center space-x-1"
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        <span>Pay Online Now</span>
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center justify-end">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Online Payment Modal */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Instant Customer Payment</h3>
                <p className="text-xs text-slate-500">Invoice {payInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setPayInvoice(null)}>✕</button>
            </div>

            <form onSubmit={handlePortalPay} className="space-y-4 text-xs">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
                <span className="text-xs text-purple-700 uppercase font-bold">Payable Balance Due</span>
                <div className="text-2xl font-black text-[#714B67] mt-0.5">
                  ₹{payInvoice.amountDue.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Select Payment Gateway / Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('UPI')}
                    className={`p-3 rounded-lg border text-center font-bold transition-all ${
                      payMethod === 'UPI' ? 'border-[#714B67] bg-purple-50 text-[#714B67]' : 'border-slate-200'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mx-auto mb-1" />
                    <span>UPI / QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('CREDIT_CARD')}
                    className={`p-3 rounded-lg border text-center font-bold transition-all ${
                      payMethod === 'CREDIT_CARD' ? 'border-[#714B67] bg-purple-50 text-[#714B67]' : 'border-slate-200'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1" />
                    <span>Credit / Debit Card</span>
                  </button>
                </div>
              </div>

              {payMethod === 'UPI' && (
                <div className="p-3 bg-slate-50 rounded-lg text-center border text-slate-600">
                  <div className="font-mono font-bold text-xs text-slate-800">brightloop.odoo@icici</div>
                  <div className="text-[10px] text-slate-400 mt-1">Instant simulated settlement will mark invoice as PAID</div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPayInvoice(null)}
                  className="px-3 py-1.5 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm"
                >
                  {isProcessing ? 'Processing Transaction...' : `Confirm & Pay ₹${payInvoice.amountDue.toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Update Company Billing Profile</h3>
              <button onClick={() => setShowEditProfile(false)}>✕</button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Street Address</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#714B67] text-white font-bold rounded shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
