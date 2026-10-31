import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Customer } from '../types';
import { Users, Plus, Search, Building2, Mail, Phone, MapPin } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);

  // New customer state
  const [companyName, setCompanyName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 15');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await api.listCustomers(search);
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      alert(`Error loading customers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.createCustomer({
        companyName,
        contactName,
        email,
        phone,
        city,
        paymentTerms
      });

      if (res.success) {
        alert(res.message);
        setShowModal(false);
        setCompanyName('');
        setEmail('');
        await loadCustomers();
      }
    } catch (err: any) {
      alert(`Failed to create customer: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-[#714B67]" />
            Client Accounts & Companies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of subscribed organizations and enterprise accounts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by company name, contact person, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
          className="flex-1 text-sm bg-transparent outline-none text-slate-800"
        />
        <button onClick={loadCustomers} className="px-3 py-1.5 bg-slate-100 rounded text-xs font-semibold">
          Search
        </button>
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-purple-200 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{c.companyName}</h3>
                <div className="text-xs text-slate-500">{c.contactName}</div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {c.status}
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center">
                <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <span>{c.email}</span>
              </div>
              {c.phone && (
                <div className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>{c.phone}</span>
                </div>
              )}
              {c.city && (
                <div className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>{c.city}, {c.country}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 grid grid-cols-3 text-center text-xs">
              <div>
                <div className="font-bold text-slate-800">{c._count?.subscriptions || 0}</div>
                <div className="text-[10px] text-slate-400">Subscriptions</div>
              </div>
              <div>
                <div className="font-bold text-slate-800">{c._count?.invoices || 0}</div>
                <div className="text-[10px] text-slate-400">Invoices</div>
              </div>
              <div>
                <div className="font-bold text-emerald-600">{c._count?.payments || 0}</div>
                <div className="text-[10px] text-slate-400">Payments</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add Customer Company</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wayne Enterprises"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bruce Wayne"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. contact@waynecorp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#714B67] text-white font-bold rounded">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
