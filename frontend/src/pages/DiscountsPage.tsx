import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Discount, Tax, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Percent,
  Plus,
  ShieldAlert,
  Calendar,
  Layers,
  CheckCircle,
  Tag,
  AlertCircle
} from 'lucide-react';

export const DiscountsPage: React.FC = () => {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [discountType, setDiscountType] = useState<string>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minPurchase, setMinPurchase] = useState<number>(0);
  const [minQuantity, setMinQuantity] = useState<number>(5);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [scope, setScope] = useState<string>('SUBSCRIPTION');
  const [targetProductId, setTargetProductId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [discRes, taxRes, prodRes] = await Promise.all([
        api.listDiscounts(),
        api.listTaxes(),
        api.listProducts()
      ]);
      if (discRes.success) setDiscounts(discRes.data);
      if (taxRes.success) setTaxes(taxRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err: any) {
      alert(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDiscount(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.createDiscount({
        name,
        discountType,
        discountValue,
        minPurchase,
        minQuantity,
        usageLimit,
        scope,
        targetProductId: scope === 'SPECIFIC_PRODUCT' ? targetProductId : undefined
      });

      if (res.success) {
        alert(res.message);
        setShowDiscountModal(false);
        setName('');
        await loadData();
      }
    } catch (err: any) {
      alert(`Failed to create discount rule: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Percent className="w-6 h-6 mr-2 text-[#714B67]" />
            Discount Rules & Automated Taxes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rules auto-applied during recurring billing cycles based on seat volume, purchase minimums, and usage limits.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowDiscountModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Discount Rule</span>
          </button>
        )}
      </div>

      {/* Admin Notice */}
      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center space-x-3 text-xs text-purple-900">
        <ShieldAlert className="w-5 h-5 text-[#714B67] flex-shrink-0" />
        <div>
          <strong>Admin Governance:</strong> As specified in the problem statement, only administrators can define discount policies. Once active, the billing engine checks quantity, purchase threshold, and usage limits to apply discounts automatically on subsequent invoices.
        </div>
      </div>

      {/* Discount Rules Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
          Configured Discount Automation Rules ({discounts.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((d) => {
            const isExhausted = d.usageLimit !== null && d.usageCount >= d.usageLimit;
            return (
              <div
                key={d.id}
                className={`bg-white rounded-xl border p-5 shadow-sm space-y-3 ${
                  isExhausted ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      {d.scope === 'SUBSCRIPTION' ? 'Whole Subscription' : 'Specific Product'}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">{d.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-[#714B67]">
                      {d.discountType === 'PERCENTAGE' ? `${d.discountValue}% OFF` : `₹${d.discountValue} FLAT`}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Min Quantity / Seats:</span>
                    <span className="font-bold text-slate-800">{d.minQuantity} seats</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Subtotal:</span>
                    <span className="font-bold text-slate-800">₹{d.minPurchase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage Progress:</span>
                    <span className="font-bold text-purple-700">
                      {d.usageCount} / {d.usageLimit || '∞'} used
                    </span>
                  </div>
                  {d.targetProduct && (
                    <div className="flex justify-between text-indigo-700 font-medium">
                      <span>Target Product:</span>
                      <span>{d.targetProduct.name}</span>
                    </div>
                  )}
                </div>

                {isExhausted && (
                  <div className="text-[11px] text-rose-600 font-bold flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Usage limit exhausted. No longer applied.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax Rules Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Tax Rules Engine ({taxes.length})
        </h3>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="py-2.5 px-3">Tax Rule</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Rate</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {taxes.map((t) => (
              <tr key={t.id}>
                <td className="py-2 px-3 font-semibold text-slate-800">{t.name}</td>
                <td className="py-2 px-3 text-slate-500">{t.taxType}</td>
                <td className="py-2 px-3 font-bold text-slate-900">{t.rate}%</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {t.isDefault ? 'Default Auto-calculated' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Create Discount Automation Rule</h3>
              <button onClick={() => setShowDiscountModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDiscount} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Discount Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Volume Seat 15% Tier"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Type *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED AMOUNT (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Value *</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none font-bold text-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Min Quantity / Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Min Purchase Amount (₹)</label>
                  <input
                    type="number"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Usage Limit (Max Uses)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value) || 100)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="SUBSCRIPTION">Whole Subscription</option>
                    <option value="SPECIFIC_PRODUCT">Specific Product</option>
                  </select>
                </div>
              </div>

              {scope === 'SPECIFIC_PRODUCT' && (
                <div>
                  <label className="font-bold block mb-1">Target Product</label>
                  <select
                    value={targetProductId}
                    onChange={(e) => setTargetProductId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowDiscountModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#714B67] text-white font-bold rounded">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
