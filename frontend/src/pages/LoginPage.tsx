import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, Building2, User, CheckCircle2, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, quickSwitchRole } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  // Live password validation check for registration
  const passLength = password.length > 8;
  const passUpper = /[A-Z]/.test(password);
  const passLower = /[a-z]/.test(password);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = passLength && passUpper && passLower && passSpecial;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    if (!isPasswordValid) {
      setErrors(['Please ensure your password meets all complexity requirements below.']);
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        companyName,
        email,
        password
      });
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg(null);
    setResetLink(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      if (res.success) {
        setSuccessMsg(res.message);
        if (res.resetLink) setResetLink(res.resetLink);
      }
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-[#714B67] text-white items-center justify-center text-2xl font-black shadow-lg shadow-purple-900/20 mb-2">
          🔄
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Brightloop Software</h2>
        <p className="text-xs text-slate-500 mt-1">Odoo Hackathon 2026 • Unified Subscription ERP</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => { setTab('login'); setErrors([]); }}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors ${
                tab === 'login' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setErrors([]); }}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors ${
                tab === 'register' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              New Customer
            </button>
            <button
              onClick={() => { setTab('forgot'); setErrors([]); }}
              className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors ${
                tab === 'forgot' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Reset Pass
            </button>
          </div>

          {/* Errors banner */}
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>{errors.join(' ')}</div>
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              {resetLink && (
                <div className="pt-2 border-t border-emerald-200">
                  <span className="block text-[11px] text-emerald-700 font-mono break-all mb-1">
                    Simulated Link: {resetLink}
                  </span>
                  <a
                    href={resetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-3 py-1 bg-emerald-600 text-white font-bold rounded text-xs hover:bg-emerald-700"
                  >
                    Open Password Reset Link →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Sign In Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@brightloop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs p-2.5 pl-8 border border-slate-200 rounded-lg outline-none focus:border-[#714B67]"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs p-2.5 pl-8 border border-slate-200 rounded-lg outline-none focus:border-[#714B67]"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#714B67] hover:bg-[#5b3b52] text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In to Portal'}
              </button>

              {/* Evaluator Quick Demo Accounts */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 text-center">
                  Quick Demo Login (1-Click Test)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => quickSwitchRole('ADMIN')}
                    className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-[#714B67] rounded text-[11px] font-bold border border-purple-200"
                  >
                    SuperAdmin
                  </button>
                  <button
                    type="button"
                    onClick={() => quickSwitchRole('STAFF')}
                    className="py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded text-[11px] font-bold border border-teal-200"
                  >
                    Sales Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => quickSwitchRole('CUSTOMER')}
                    className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[11px] font-bold border border-blue-200"
                  >
                    Customer
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Customer Registration with Live Password Security Criteria */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Company / Business Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Software Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs p-2 pl-8 border border-slate-200 rounded-lg outline-none"
                  />
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2 pl-8 border border-slate-200 rounded-lg outline-none"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Business Email *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="sarah@apexsoftware.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs p-2 pl-8 border border-slate-200 rounded-lg outline-none"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs p-2 pl-8 border border-slate-200 rounded-lg outline-none"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* PS Password Complexity Checklist */}
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1 border border-slate-100">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Problem Statement Security Rules:</div>
                  <div className={`flex items-center space-x-1.5 ${passLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{passLength ? '✓' : '○'}</span>
                    <span>More than eight characters ({password.length}/9+)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{passUpper ? '✓' : '○'}</span>
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{passLower ? '✓' : '○'}</span>
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passSpecial ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{passSpecial ? '✓' : '○'}</span>
                    <span>At least one special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full py-2.5 bg-[#714B67] hover:bg-[#5b3b52] text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-40"
              >
                {loading ? 'Creating account...' : 'Complete Customer Registration'}
              </button>
            </form>
          )}

          {/* Forgot Password Flow */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-slate-500">
                Enter your registered business email. A secure reset token will be dispatched to your account.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registered Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@acmecorp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs p-2.5 pl-8 border border-slate-200 rounded-lg outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#714B67] hover:bg-[#5b3b52] text-white rounded-lg text-xs font-bold shadow-md disabled:opacity-50"
              >
                {loading ? 'Sending link...' : 'Generate Reset Token & Link'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
