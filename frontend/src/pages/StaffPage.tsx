import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Plus, ShieldCheck, Mail, Lock } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // New staff form state
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('Brightloop@2026');
  const [role, setRole] = useState<string>('STAFF');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await api.listStaff();
      if (res.success) {
        setStaff(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    try {
      const res = await api.createStaff({ name, email, password, role });
      if (res.success) {
        alert(res.message);
        setShowModal(false);
        setName('');
        setEmail('');
        await loadStaff();
      }
    } catch (err: any) {
      setFormErrors([err.message]);
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
        <h3 className="font-bold">Access Denied</h3>
        <p className="text-xs mt-1">Only the administrator can access staff management and create internal accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <UserCheck className="w-6 h-6 mr-2 text-[#714B67]" />
            Internal Team & Staff Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Admin-governed user provisioning for sales reps and operations staff.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#5b3b52] text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role / Access</th>
              <th className="py-3 px-4">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                <td className="py-3 px-4 text-slate-600">{s.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.role === 'ADMIN' ? 'bg-purple-100 text-purple-900' : 'bg-teal-100 text-teal-800'
                  }`}>
                    {s.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {new Date(s.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Provision Internal Staff Member</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            {formErrors.length > 0 && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">
                {formErrors.join(' ')}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Green"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Staff Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rachel@brightloop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Temporary Password * (&gt;8 chars, upper, lower, special)</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="STAFF">Internal Staff (Sales / Operations)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#714B67] text-white font-bold rounded">
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
