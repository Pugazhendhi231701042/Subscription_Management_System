export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  customerId?: string | null;
}

export interface Customer {
  id: string;
  userId?: string | null;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  country?: string;
  taxNumber?: string | null;
  paymentTerms: string;
  status: string;
  createdAt: string;
  _count?: {
    subscriptions: number;
    invoices: number;
    payments: number;
  };
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  priceAdjustment: number;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  isActive: boolean;
  variants: ProductVariant[];
  plans: Plan[];
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  billingFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  price: number;
  minQuantity: number;
  startDate?: string | null;
  endDate?: string | null;
  autoCloseOnEnd: boolean;
  allowPause: boolean;
  allowEarlyClose: boolean;
  allowRenewal: boolean;
  isActive: boolean;
  product?: Product;
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  taxType: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Discount {
  id: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minPurchase: number;
  minQuantity: number;
  startDate?: string | null;
  endDate?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  scope: 'SUBSCRIPTION' | 'SPECIFIC_PRODUCT';
  targetProductId?: string | null;
  targetProduct?: Product | null;
  isActive: boolean;
}

export interface QuotationLine {
  id?: string;
  productId: string;
  variantId?: string | null;
  product?: Product;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer?: Customer;
  planId: string;
  plan?: Plan;
  validityDate: string;
  paymentTerms: string;
  status: 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  lines: QuotationLine[];
  subscription?: { id: string; subscriptionNumber: string } | null;
}

export interface SubscriptionLine {
  id: string;
  productId: string;
  variantId?: string | null;
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customer: Customer;
  planId: string;
  plan: Plan;
  quotationId?: string | null;
  status: 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  startDate: string;
  expiryDate?: string | null;
  nextBillingDate: string;
  lastBilledDate?: string | null;
  paymentTerms: string;
  autoCloseOnEnd: boolean;
  allowPause: boolean;
  allowEarlyClose: boolean;
  allowRenewal: boolean;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  lines: SubscriptionLine[];
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    amountDue: number;
  }>;
}

export interface InvoiceLine {
  id: string;
  productId: string;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  subscription?: Subscription;
  customerId: string;
  customer: Customer;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  sentAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  lines: InvoiceLine[];
  payments?: Payment[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  customerId: string;
  customer?: Customer;
  invoice?: { id: string; invoiceNumber: string; totalAmount: number; status: string };
  amount: number;
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'OTHER';
  paymentDate: string;
  referenceNumber?: string | null;
  notes?: string | null;
  recordedByUser?: { id: string; name: string; email: string } | null;
}

export interface DashboardMetrics {
  performance: {
    queryDurationMs: number;
    satisfiesTarget: boolean;
  };
  kpi: {
    activeSubscriptionsCount: number;
    totalSubscriptionsCount: number;
    mrr: number;
    arr: number;
    totalRevenueCollected: number;
    totalOutstandingDue: number;
    overdueInvoicesCount: number;
    overdueTotalAmount: number;
  };
  statusDistribution: Record<string, number>;
  overdueList: Array<{
    id: string;
    invoiceNumber: string;
    companyName: string;
    contactName: string;
    email: string;
    dueDate: string;
    daysOverdue: number;
    totalAmount: number;
    amountDue: number;
    subscriptionNumber?: string;
  }>;
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber?: string;
    customer: { companyName: string };
    invoice: { invoiceNumber: string };
  }>;
}
