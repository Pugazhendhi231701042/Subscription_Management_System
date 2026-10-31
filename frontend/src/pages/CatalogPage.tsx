import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, Plan } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Layers,
  Calendar,
  CheckCircle,
  Tag,
  DollarSign,
  Repeat,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'plans'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New product modal state
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [prodName, setProdName] = useState<string>('');
  const [prodType, setProdType] = useState<string>('Software');
  const [prodSalesPrice, setProdSalesPrice] = useState<number>(4000);
  const [prodCostPrice, setProdCostPrice] = useState<number>(800);
  const [prodNotes, setProdNotes] = useState<string>('');
  const [variants, setVariants] = useState<any[]>([
    { variantName: 'Standard Edition', priceAdjustment: 0 },
    { variantName: 'Odoo Connected Brand', priceAdjustment: 560 } // Explicitly matches PS!
  ]);

  // New plan modal state
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [planProductId, setPlanProductId] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [planFrequency, setPlanFrequency] = useState<string>('MONTHLY');
  const [planPrice, setPlanPrice] = useState<number>(4000);
  const [planMinQty, setPlanMinQty] = useState<number>(1);
  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState<boolean>(false);
  const [allowPause, setAllowPause] = useState<boolean>(true);
  const [allowEarlyClose, setAllowEarlyClose] = useState<boolean>(true);
  const [allowRenewal, setAllowRenewal] = useState<boolean>(true);

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    try {
      const [prodsRes, plansRes] = await Promise.all([
        api.listProducts(),
        api.listPlans()
      ]);
      if (prodsRes.success) setProducts(prodsRes.data);
      if (plansRes.success) setPlans(plansRes.data);
    } catch (err: any) {
      alert(`Error loading catalog: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function addVariantRow() {
    setVariants([...variants, { variantName: '', priceAdjustment: 0 }]);
  }

  function updateVariantRow(idx: number, field: string, val: any) {
    const updated = [...variants];
    updated[idx][field] = val;
    setVariants(updated);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.createProduct({
        name: prodName,
        type: prodType,
        salesPrice: prodSalesPrice,
        costPrice: prodCostPrice,
        notes: prodNotes,
        variants: variants.filter(v => v.variantName.trim().length > 0)
      });

      if (res.success) {
        alert(res.message);
        setShowProductModal(false);
        setProdName('');
        await loadCatalog();
      }
    } catch (err: any) {
      alert(`Product creation failed: ${err.message}`);
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planProductId || !planName) {
      alert('Product and Plan Name are required.');
      return;
    }
    try {
      const res = await api.createPlan({
        productId: planProductId,
        name: planName,
        billingFrequency: planFrequency,
        price: planPrice,
        minQuantity: planMinQty,
        autoCloseOnEnd,
        allowPause,
        allowEarlyClose,
        allowRenewal
      });

      if (res.success) {
        alert(res.message);
        setShowPlanModal(false);
        setPlanName('');
        await loadCatalog();
      }
    } catch (err: any) {
      alert(`Plan creation failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-[#714B67]" />
            Products & Subscription Plans
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure software offerings, brand variants (e.g. Odoo edition +560), and recurring lifecycle rules.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex space-x-2">
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
            <button
              onClick={() => {
                if (products.length > 0) setPlanProductId(products[0].id);
                setShowPlanModal(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Plan</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products & Configurable Variants ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'plans'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Recurring Billing Plans & Rules ({plans.length})</span>
        </button>
      </div>

      {/* Products Grid */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-purple-200 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    {p.type}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{p.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#714B67]">₹{p.salesPrice.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-400">Cost: ₹{p.costPrice}</div>
                </div>
              </div>

              {p.notes && <p className="text-xs text-slate-500 line-clamp-2 italic">{p.notes}</p>}

              {/* Variants Section */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Configured Variants ({p.variants?.length || 0})
                </span>
                <div className="space-y-1">
                  {p.variants?.map((v) => (
                    <div key={v.id} className="flex justify-between items-center text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">{v.variantName}</span>
                      <span className="font-bold text-emerald-700">
                        {v.priceAdjustment > 0 ? `+₹${v.priceAdjustment}` : 'Included (₹0)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Associated Plans */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{p.plans?.length || 0} active recurring plans</span>
                <span className="text-emerald-600 font-semibold">● In Catalog</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plans List */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((pl) => (
            <div key={pl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    {pl.billingFrequency} BILLING
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{pl.name}</h3>
                  <div className="text-xs text-slate-400">For: {pl.product?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-teal-700">₹{pl.price.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-400">Min Seats: {pl.minQuantity}</div>
                </div>
              </div>

              {/* Lifecycle flags as per Problem Statement */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs">
                <div className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">Plan Lifecycle Rules</div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Auto-close when end date reached:</span>
                  <span className={`font-bold ${pl.autoCloseOnEnd ? 'text-amber-700' : 'text-slate-400'}`}>
                    {pl.autoCloseOnEnd ? 'YES (Auto-expire)' : 'NO'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Customer Pause Allowed:</span>
                  <span className={`font-bold ${pl.allowPause ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {pl.allowPause ? 'ALLOWED' : 'LOCKED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Early Close Permitted:</span>
                  <span className={`font-bold ${pl.allowEarlyClose ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {pl.allowEarlyClose ? 'ALLOWED' : 'NO (Fixed Term)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Auto / Manual Renewal:</span>
                  <span className={`font-bold ${pl.allowRenewal ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {pl.allowRenewal ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add New Product & Variants</h3>
              <button onClick={() => setShowProductModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brightloop ERP Suite"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Type</label>
                  <select
                    value={prodType}
                    onChange={(e) => setProdType(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="Software">Software</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sales Price (₹)</label>
                  <input
                    type="number"
                    value={prodSalesPrice}
                    onChange={(e) => setProdSalesPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Variants Section */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Product Variants (e.g. Odoo Brand +560)</label>
                  <button type="button" onClick={addVariantRow} className="text-xs text-[#714B67] font-bold hover:underline">
                    + Add Variant
                  </button>
                </div>
                <div className="space-y-1.5">
                  {variants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Variant name"
                        value={v.variantName}
                        onChange={(e) => updateVariantRow(i, 'variantName', e.target.value)}
                        className="flex-1 text-xs p-1.5 border border-slate-200 rounded outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Price adjustment (+₹)"
                        value={v.priceAdjustment}
                        onChange={(e) => updateVariantRow(i, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                        className="w-32 text-xs p-1.5 border border-slate-200 rounded outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-3 py-1.5 bg-slate-100 text-xs font-semibold rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#714B67] text-white text-xs font-bold rounded">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add Subscription Plan</h3>
              <button onClick={() => setShowPlanModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Target Product *</label>
                <select
                  value={planProductId}
                  onChange={(e) => setPlanProductId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Base: ₹{p.salesPrice})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Business Monthly Flex"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Billing Frequency *</label>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none font-bold text-teal-800"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Recurring Rate (₹)</label>
                  <input
                    type="number"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Minimum Seats / Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={planMinQty}
                    onChange={(e) => setPlanMinQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Lifecycle check flags */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-2 border">
                <span className="font-bold uppercase text-[10px] text-slate-400 block">Lifecycle Rules</span>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={autoCloseOnEnd} onChange={(e) => setAutoCloseOnEnd(e.target.checked)} />
                  <span>Auto-close subscription when end date is reached</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={allowPause} onChange={(e) => setAllowPause(e.target.checked)} />
                  <span>Allow customer / staff to pause subscription</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={allowEarlyClose} onChange={(e) => setAllowEarlyClose(e.target.checked)} />
                  <span>Allow early cancellation before contract expiry</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={allowRenewal} onChange={(e) => setAllowRenewal(e.target.checked)} />
                  <span>Allow manual or auto-renewal</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowPlanModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-teal-600 text-white font-bold rounded">
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
