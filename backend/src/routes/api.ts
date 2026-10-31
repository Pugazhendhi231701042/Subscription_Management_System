import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, getMe } from '../controllers/authController.js';
import { listStaff, createStaff } from '../controllers/staffController.js';
import { listProducts, getProduct, createProduct, updateProduct, addVariant } from '../controllers/productController.js';
import { listPlans, getPlan, createPlan, updatePlan } from '../controllers/planController.js';
import { listTaxes, createTax } from '../controllers/taxController.js';
import { listDiscounts, createDiscount, updateDiscount } from '../controllers/discountController.js';
import { listTemplates, createTemplate, listQuotations, getQuotation, createQuotation, convertToSubscription } from '../controllers/quotationController.js';
import { listSubscriptions, getSubscription, createSubscription, updateStatus } from '../controllers/subscriptionController.js';
import { previewDueBilling, runBillingCycle } from '../controllers/billingController.js';
import { listInvoices, getInvoice, confirmInvoice, cancelInvoice, sendInvoice } from '../controllers/invoiceController.js';
import { listPayments, recordPayment } from '../controllers/paymentController.js';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { listCustomers, getCustomer, getPortalData, createCustomer, updatePortalProfile, portalPayInvoice } from '../controllers/customerController.js';
import { listAuditLogs } from '../controllers/auditController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const apiRouter = Router();

// ================= AUTHENTICATION & REGISTRATION =================
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
apiRouter.post('/auth/forgot-password', forgotPassword);
apiRouter.post('/auth/reset-password', resetPassword);
apiRouter.get('/auth/me', authenticate, getMe);

// ================= INTERNAL STAFF MANAGEMENT (ADMIN ONLY) =================
apiRouter.get('/staff', authenticate, requireRole(['ADMIN']), listStaff);
apiRouter.post('/staff', authenticate, requireRole(['ADMIN']), createStaff);

// ================= PRODUCTS & VARIANTS =================
apiRouter.get('/products', authenticate, listProducts);
apiRouter.get('/products/:id', authenticate, getProduct);
apiRouter.post('/products', authenticate, requireRole(['ADMIN']), createProduct);
apiRouter.put('/products/:id', authenticate, requireRole(['ADMIN']), updateProduct);
apiRouter.post('/products/:id/variants', authenticate, requireRole(['ADMIN']), addVariant);

// ================= PLANS =================
apiRouter.get('/plans', authenticate, listPlans);
apiRouter.get('/plans/:id', authenticate, getPlan);
apiRouter.post('/plans', authenticate, requireRole(['ADMIN']), createPlan);
apiRouter.put('/plans/:id', authenticate, requireRole(['ADMIN']), updatePlan);

// ================= TAXES =================
apiRouter.get('/taxes', authenticate, listTaxes);
apiRouter.post('/taxes', authenticate, requireRole(['ADMIN']), createTax);

// ================= DISCOUNTS (ADMIN ONLY) =================
apiRouter.get('/discounts', authenticate, listDiscounts);
apiRouter.post('/discounts', authenticate, requireRole(['ADMIN']), createDiscount);
apiRouter.put('/discounts/:id', authenticate, requireRole(['ADMIN']), updateDiscount);

// ================= QUOTATIONS & TEMPLATES =================
apiRouter.get('/quotations/templates', authenticate, listTemplates);
apiRouter.post('/quotations/templates', authenticate, requireRole(['ADMIN', 'STAFF']), createTemplate);
apiRouter.get('/quotations', authenticate, listQuotations);
apiRouter.get('/quotations/:id', authenticate, getQuotation);
apiRouter.post('/quotations', authenticate, requireRole(['ADMIN', 'STAFF']), createQuotation);
apiRouter.post('/quotations/:id/convert', authenticate, requireRole(['ADMIN', 'STAFF']), convertToSubscription);

// ================= SUBSCRIPTIONS =================
apiRouter.get('/subscriptions', authenticate, listSubscriptions);
apiRouter.get('/subscriptions/:id', authenticate, getSubscription);
apiRouter.post('/subscriptions', authenticate, requireRole(['ADMIN', 'STAFF']), createSubscription);
apiRouter.post('/subscriptions/:id/status', authenticate, requireRole(['ADMIN', 'STAFF']), updateStatus);

// ================= BILLING ENGINE =================
apiRouter.get('/billing/preview', authenticate, requireRole(['ADMIN', 'STAFF']), previewDueBilling);
apiRouter.post('/billing/run', authenticate, requireRole(['ADMIN', 'STAFF']), runBillingCycle);

// ================= INVOICES =================
apiRouter.get('/invoices', authenticate, listInvoices);
apiRouter.get('/invoices/:id', authenticate, getInvoice);
apiRouter.post('/invoices/:id/confirm', authenticate, requireRole(['ADMIN', 'STAFF']), confirmInvoice);
apiRouter.post('/invoices/:id/cancel', authenticate, requireRole(['ADMIN', 'STAFF']), cancelInvoice);
apiRouter.post('/invoices/:id/send', authenticate, requireRole(['ADMIN', 'STAFF']), sendInvoice);

// ================= PAYMENTS =================
apiRouter.get('/payments', authenticate, listPayments);
apiRouter.post('/payments', authenticate, requireRole(['ADMIN', 'STAFF']), recordPayment);

// ================= CUSTOMERS & PORTAL =================
apiRouter.get('/customers', authenticate, requireRole(['ADMIN', 'STAFF']), listCustomers);
apiRouter.post('/customers', authenticate, requireRole(['ADMIN', 'STAFF']), createCustomer);
apiRouter.get('/customers/:id', authenticate, getCustomer);
apiRouter.get('/portal', authenticate, getPortalData);
apiRouter.put('/portal/profile', authenticate, updatePortalProfile);
apiRouter.post('/portal/invoices/:id/pay', authenticate, portalPayInvoice);

// ================= AUDIT LOGS (ADMIN ONLY) =================
apiRouter.get('/audit-logs', authenticate, requireRole(['ADMIN']), listAuditLogs);

// ================= EXECUTIVE FINANCE DASHBOARD =================
apiRouter.get('/dashboard', authenticate, requireRole(['ADMIN', 'STAFF']), getDashboardMetrics);
