const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('brightloop_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('brightloop_token', token);
  } else {
    localStorage.removeItem('brightloop_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data.errors ? data.errors.join(' ') : (data.error || 'Request failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (email: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request<any>('/auth/me'),

  // Staff (Admin only)
  listStaff: () => request<any>('/staff'),
  createStaff: (payload: any) => request<any>('/staff', { method: 'POST', body: JSON.stringify(payload) }),

  // Products & Variants
  listProducts: () => request<any>('/products'),
  getProduct: (id: string) => request<any>(`/products/${id}`),
  createProduct: (payload: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  addVariant: (productId: string, payload: any) => request<any>(`/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(payload) }),

  // Plans
  listPlans: () => request<any>('/plans'),
  getPlan: (id: string) => request<any>(`/plans/${id}`),
  createPlan: (payload: any) => request<any>('/plans', { method: 'POST', body: JSON.stringify(payload) }),
  updatePlan: (id: string, payload: any) => request<any>(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Taxes
  listTaxes: () => request<any>('/taxes'),
  createTax: (payload: any) => request<any>('/taxes', { method: 'POST', body: JSON.stringify(payload) }),

  // Discounts
  listDiscounts: () => request<any>('/discounts'),
  createDiscount: (payload: any) => request<any>('/discounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateDiscount: (id: string, payload: any) => request<any>(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Quotations
  listTemplates: () => request<any>('/quotations/templates'),
  createTemplate: (payload: any) => request<any>('/quotations/templates', { method: 'POST', body: JSON.stringify(payload) }),
  listQuotations: (params: string = '') => request<any>(`/quotations${params ? `?${params}` : ''}`),
  getQuotation: (id: string) => request<any>(`/quotations/${id}`),
  createQuotation: (payload: any) => request<any>('/quotations', { method: 'POST', body: JSON.stringify(payload) }),
  convertToSubscription: (id: string) => request<any>(`/quotations/${id}/convert`, { method: 'POST' }),

  // Subscriptions
  listSubscriptions: (params: string = '') => request<any>(`/subscriptions${params ? `?${params}` : ''}`),
  getSubscription: (id: string) => request<any>(`/subscriptions/${id}`),
  createSubscription: (payload: any) => request<any>('/subscriptions', { method: 'POST', body: JSON.stringify(payload) }),
  updateSubscriptionStatus: (id: string, action: string) => request<any>(`/subscriptions/${id}/status`, { method: 'POST', body: JSON.stringify({ action }) }),

  // Billing Engine
  previewDueBilling: () => request<any>('/billing/preview'),
  runBillingCycle: (payload: any = {}) => request<any>('/billing/run', { method: 'POST', body: JSON.stringify(payload) }),

  // Invoices
  listInvoices: (params: string = '') => request<any>(`/invoices${params ? `?${params}` : ''}`),
  getInvoice: (id: string) => request<any>(`/invoices/${id}`),
  confirmInvoice: (id: string) => request<any>(`/invoices/${id}/confirm`, { method: 'POST' }),
  cancelInvoice: (id: string) => request<any>(`/invoices/${id}/cancel`, { method: 'POST' }),
  sendInvoice: (id: string) => request<any>(`/invoices/${id}/send`, { method: 'POST' }),

  // Payments
  listPayments: (params: string = '') => request<any>(`/payments${params ? `?${params}` : ''}`),
  recordPayment: (payload: any) => request<any>('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  // Customers & Portal
  listCustomers: (search: string = '') => request<any>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (payload: any) => request<any>('/customers', { method: 'POST', body: JSON.stringify(payload) }),
  getPortalData: () => request<any>('/portal'),
  updatePortalProfile: (payload: any) => request<any>('/portal/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  portalPayInvoice: (id: string, payload: any = {}) => request<any>(`/portal/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(payload) }),

  // Audit Logs (Admin only)
  listAuditLogs: (params: string = '') => request<any>(`/audit-logs${params ? `?${params}` : ''}`),

  // Dashboard Metrics
  getDashboardMetrics: () => request<any>('/dashboard')
};
