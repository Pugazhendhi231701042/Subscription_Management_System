import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Search, Filter, Clock, User, FileText, CheckCircle2 } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.append('entityType', entityFilter);
      if (search) params.append('search', search);

      const res = await api.listAuditLogs(params.toString());
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err: any) {
      alert(`Error loading audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2 text-[#714B67]" />
            Enterprise Audit Trail & Security Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable tracking of state transitions, batch recurring billing runs, and financial actions.
          </p>
        </div>

        {/* Entity Filters */}
        <div className="flex flex-wrap gap-1.5">
          {['', 'SUBSCRIPTION', 'INVOICE', 'PAYMENT', 'PRODUCT', 'DISCOUNT', 'STAFF'].map((f) => (
            <button
              key={f}
              onClick={() => setEntityFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                entityFilter === f
                  ? 'bg-[#714B67] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search audit trail by user, action, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
          className="flex-1 text-sm bg-transparent outline-none text-slate-800"
        />
        <button onClick={loadLogs} className="px-3 py-1.5 bg-slate-100 rounded text-xs font-semibold">
          Search
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No audit logs recorded for this criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  let actionBadge = 'bg-slate-100 text-slate-700';
                  if (log.action === 'CREATE') actionBadge = 'bg-emerald-100 text-emerald-800';
                  if (log.action === 'UPDATE') actionBadge = 'bg-blue-100 text-blue-800';
                  if (log.action === 'BILLING_RUN') actionBadge = 'bg-purple-100 text-purple-900 font-bold';
                  if (log.action === 'PAYMENT') actionBadge = 'bg-teal-100 text-teal-800 font-bold';
                  if (log.action === 'STATUS_CHANGE') actionBadge = 'bg-amber-100 text-amber-900';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{log.user?.name || 'System Runner'}</div>
                        <div className="text-[10px] text-slate-400">{log.user?.role || 'SYSTEM'}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${actionBadge}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 whitespace-nowrap">
                        {log.entityType}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
