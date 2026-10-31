import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Quotation, Customer, Plan, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusbarPipeline } from '../components/StatusbarPipeline';
import {
  FileText,
  Plus,
  ArrowRight,
  Search,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';

export const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [converting, setConverting] = useState<boolean>(false);

  // New quote form state
  const [customerId, setCustomerId] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 15');
  const [lines, setLines] = useState<any[]>([
    { productId: '', variantId: '', quantity: 5, unitPrice: 4000, taxRate: 18 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [quotesRes, custRes, plansRes, prodsRes, tmplRes] = await Promise.all([
        api.listQuotations(),
        api.listCustomers(),
        api.listPlans(),
        api.listProducts(),
        api.listTemplates()
      ]);

      if (quotesRes.success) setQuotations(quotesRes.data);
      if (custRes.success) setCustomers(custRes.data);
      if (plansRes.success) setPlans(plansRes.data);
      if (prodsRes.success) setProducts(prodsRes.data);
      if (tmplRes.success) setTemplates(tmplRes.data);
    } catch (err: any) {
      alert(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleApplyTemplate(tId: string) {
    setTemplateId(tId);
    const tmpl = templates.find(t => t.id === tId);
    if (tmpl) {
      setPlanId(tmpl.planId);
      setValidityDays(tmpl.validityDays);
      if (tmpl.templateLines && tmpl.templateLines.length > 0) {
        setLines(tmpl.templateLines.map((tl: any) => ({
          productId: tl.productId,
          variantId: tl.variantId || '',
          quantity: tl.quantity,
          unitPrice: tl.unitPrice,
          taxRate: 18
        })));
      }
    }
  }

  function addLine() {
    setLines([...lines, { productId: '', variantId: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, val: any) {
    const updated = [...lines];
    updated[idx][field] = val;

    // Auto-update price if product or variant changes
    if (field === 'productId') {
      const p = products.find(prod => prod.id === val);
      if (p) {
        updated[idx].unitPrice = p.salesPrice;
      }
    } else if (field === 'variantId') {
      const p = products.find(prod => prod.id === updated[idx].productId);
      if (p) {
        const v = p.variants?.find(vr => vr.id === val);
        updated[idx].unitPrice = p.salesPrice + (v?.priceAdjustment || 0);
      }
    }

    setLines(updated);
  }

  async function handleCreateQuotation(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !planId || lines.length === 0) {
      alert('Please select a customer, plan, and at least one product line.');
      return;
    }

    try {
      const res = await api.createQuotation({
        customerId,
        planId,
        templateId: templateId || undefined,
        validityDays,
        paymentTerms,
        lines
      });

      if (res.success) {
        alert(res.message);
        setShowModal(false);
        await loadData();
      }
    } catch (err: any) {
      alert(`Failed to create quotation: ${err.message}`);
    }
  }

  async function handleConvertToSubscription(quoteId: string) {
    if (!confirm('Convert this Quotation into an ACTIVE recurring Subscription?')) return;
    setConverting(true);
    try {
      const res = await api.convertToSubscription(quoteId);
      if (res.success) {
        alert(res.message);
        setSelectedQuote(null);
        await loadData();
      }
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setConverting(false);
    }
  }

  // Calculate live totals for new quote modal
  const liveSubtotal = lines.reduce((acc, l) => acc + (l.quantity * (l.unitPrice || 0)), 0);
  const liveTax = lines.reduce((acc, l) => acc + ((l.quantity * (l.unitPrice || 0) * (l.taxRate || 18)) / 100), 0);
  const liveTotal = liveSubtotal + liveTax;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-[#714B67]" />
            Sales Quotations & Offers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build proposals from quotation templates, set line variants, and convert to subscriptions.
          </p>
        </div>

        {user?.role !== 'CUSTOMER' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-sm font-semibold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>
        )}
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No quotations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Quote #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Plan</th>
                  <th className="py-3 px-4 font-semibold">Validity</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#714B67]">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{q.customer?.companyName}</div>
                      <div className="text-xs text-slate-400">{q.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {q.plan?.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      Until {new Date(q.validityDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{q.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        q.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedQuote(q)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                      >
                        View
                      </button>

                      {user?.role !== 'CUSTOMER' && !q.subscription && (
                        <button
                          onClick={() => handleConvertToSubscription(q.id)}
                          disabled={converting}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold inline-flex items-center"
                        >
                          <span>Convert to Sub</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}

                      {q.subscription && (
                        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {q.subscription.subscriptionNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Quotation Modal with Template Support */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Create New Quotation</h3>
                <p className="text-xs text-slate-500">Pick customer, pre-fill from template or customize line items</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              
              {/* Template Quick Loader */}
              {templates.length > 0 && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <label className="text-xs font-bold text-[#714B67] uppercase block mb-1">
                    ⚡ Fast Start: Select Quotation Template
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-purple-200 rounded-lg outline-none font-medium text-slate-800"
                  >
                    <option value="">-- Choose a Pre-configured Template (e.g. Odoo Business Bundle) --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.validityDays} days validity)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Customer *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName} ({c.contactName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recurring Plan *</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="">-- Select Plan --</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.billingFrequency} - ₹{p.price})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Product & Variant Lines</span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-[#714B67] hover:underline font-bold flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Product Line
                  </button>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {lines.map((l, idx) => {
                    const selectedProd = products.find(p => p.id === l.productId);
                    const prodVariants = selectedProd?.variants || [];

                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                        {/* Product */}
                        <div className="flex-1 min-w-[140px]">
                          <select
                            value={l.productId}
                            onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                            required
                            className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none"
                          >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Variant */}
                        <div className="w-40">
                          <select
                            value={l.variantId || ''}
                            onChange={(e) => updateLine(idx, 'variantId', e.target.value)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none"
                          >
                            <option value="">Standard Edition (+₹0)</option>
                            {prodVariants.map(v => (
                              <option key={v.id} value={v.id}>{v.variantName} (+₹{v.priceAdjustment})</option>
                            ))}
                          </select>
                        </div>

                        {/* Qty */}
                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={l.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded text-right outline-none"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="w-24">
                          <input
                            type="number"
                            placeholder="Price"
                            value={l.unitPrice}
                            onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded text-right outline-none"
                          />
                        </div>

                        {/* Remove */}
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals Preview */}
              <div className="flex justify-end pt-2 text-xs">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">₹{liveSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated Tax (18%):</span>
                    <span className="font-semibold text-slate-800">₹{liveTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-[#714B67] border-t border-slate-200 pt-1">
                    <span>Total Proposal Value:</span>
                    <span>₹{liveTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#714B67] hover:bg-[#5b3b52] text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Create Quotation
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Quotation</span>
                <h3 className="text-xl font-bold text-slate-900 font-mono">{selectedQuote.quotationNumber}</h3>
                <div className="text-xs text-slate-500">Customer: {selectedQuote.customer?.companyName}</div>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedQuote.lines.map((l, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold">{l.product?.name}</td>
                      <td className="py-2 px-3 text-slate-500">{l.variant?.variantName || 'Standard'}</td>
                      <td className="py-2 px-3 text-right">{l.quantity}</td>
                      <td className="py-2 px-3 text-right">₹{l.unitPrice}</td>
                      <td className="py-2 px-3 text-right font-bold">₹{l.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              {user?.role !== 'CUSTOMER' && !selectedQuote.subscription ? (
                <button
                  onClick={() => handleConvertToSubscription(selectedQuote.id)}
                  disabled={converting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  <span>Convert to Active Subscription</span>
                </button>
              ) : <div />}

              <div className="text-right text-xs">
                <div className="text-slate-500">Total with 18% Tax:</div>
                <div className="text-xl font-extrabold text-[#714B67]">
                  ₹{selectedQuote.totalAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
